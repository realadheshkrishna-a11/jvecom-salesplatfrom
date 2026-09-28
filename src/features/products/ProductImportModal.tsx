import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { productsService } from '@/services/products.service';
import type { ProductInput } from '@/schemas';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileUp,
  X,
  RefreshCw,
  Info,
} from 'lucide-react';

interface ProductImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onSuccess: () => void;
}

interface ParsedProductRow {
  index: number;
  name: string;
  sku: string;
  category: string;
  cost: number;
  selling_price: number;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  isValid: boolean;
  errors: string[];
}

export function ProductImportModal({
  open,
  onOpenChange,
  orgId,
  onSuccess,
}: ProductImportModalProps) {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedProductRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'invalid'>('all');

  const resetState = () => {
    setFileName(null);
    setFileSize(null);
    setRows([]);
    setIsDragging(false);
    setIsImporting(false);
    setFilterView('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!isImporting) {
      if (!newOpen) resetState();
      onOpenChange(newOpen);
    }
  };

  // Helper to match column variations
  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const findValue = (rowObj: Record<string, any>, candidateKeys: string[]): any => {
    const normalizedKeys = Object.keys(rowObj).reduce<Record<string, string>>((acc, original) => {
      acc[normalizeKey(original)] = original;
      return acc;
    }, {});

    for (const candidate of candidateKeys) {
      const normCand = normalizeKey(candidate);
      if (normalizedKeys[normCand] !== undefined) {
        return rowObj[normalizedKeys[normCand]];
      }
    }
    return undefined;
  };

  const parseFile = async (file: File) => {
    try {
      const sizeStr =
        file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      setFileName(file.name);
      setFileSize(sizeStr);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Read first sheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('The uploaded file has no sheets or content.');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
      });

      if (!rawData || rawData.length === 0) {
        throw new Error('No rows found in the sheet. Please make sure the sheet contains header columns and data rows.');
      }

      const parsed: ParsedProductRow[] = rawData.map((rawRow, idx) => {
        const errors: string[] = [];

        // 1. Name
        const rawName = findValue(rawRow, [
          'name',
          'product_name',
          'productname',
          'product',
          'title',
          'course_name',
          'course',
          'program',
          'program_name',
          'item',
          'item_name',
        ]);
        const name = (rawName || '').toString().trim();
        if (!name) {
          errors.push('Product name is required');
        }

        // 2. SKU
        const rawSku = findValue(rawRow, [
          'sku',
          'code',
          'sku_code',
          'product_code',
          'item_code',
          'identifier',
        ]);
        const sku = (rawSku || '').toString().trim();

        // 3. Category
        const rawCategory = findValue(rawRow, [
          'category',
          'department',
          'group',
          'domain',
          'type',
        ]);
        const category = (rawCategory || 'General').toString().trim() || 'General';

        // 4. Cost
        const rawCost = findValue(rawRow, [
          'cost',
          'cost_price',
          'costprice',
          'base_price',
          'purchase_price',
          'buy_price',
          'unit_cost',
          'cost (₹)',
          'cost_inr',
        ]);
        let cost = 0;
        if (rawCost !== undefined && rawCost !== '') {
          const cleanedCost = String(rawCost).replace(/[^0-9.-]+/g, '');
          const num = parseFloat(cleanedCost);
          if (!isNaN(num) && num >= 0) {
            cost = num;
          } else {
            errors.push('Cost must be a valid number ≥ 0');
          }
        }

        // 5. Selling Price
        const rawPrice = findValue(rawRow, [
          'selling_price',
          'sellingprice',
          'price',
          'mrp',
          'rate',
          'tuition',
          'sale_price',
          'unit_price',
          'selling_price (₹)',
          'price_inr',
        ]);
        let sellingPrice = 0;
        if (rawPrice !== undefined && rawPrice !== '') {
          const cleanedPrice = String(rawPrice).replace(/[^0-9.-]+/g, '');
          const num = parseFloat(cleanedPrice);
          if (!isNaN(num) && num >= 0) {
            sellingPrice = num;
          } else {
            errors.push('Selling price must be a valid number ≥ 0');
          }
        }

        // 6. Description
        const rawDesc = findValue(rawRow, [
          'description',
          'desc',
          'details',
          'summary',
          'overview',
          'notes',
        ]);
        const description = (rawDesc || '').toString().trim();

        // 7. Status
        const rawStatus = findValue(rawRow, ['status', 'state', 'active']);
        let status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT' = 'ACTIVE';
        if (rawStatus) {
          const s = String(rawStatus).trim().toUpperCase();
          if (s === 'ARCHIVED' || s === 'INACTIVE' || s === 'DISABLED') {
            status = 'ARCHIVED';
          } else if (s === 'DRAFT') {
            status = 'DRAFT';
          } else {
            status = 'ACTIVE';
          }
        }

        return {
          index: idx + 1,
          name,
          sku: sku || `SKU-${String(idx + 1).padStart(3, '0')}`,
          category,
          cost,
          selling_price: sellingPrice,
          description,
          status,
          isValid: errors.length === 0,
          errors,
        };
      });

      setRows(parsed);
    } catch (err: unknown) {
      console.error('Error parsing file:', err);
      toastError(
        'Failed to read file',
        err instanceof Error ? err.message : 'Please ensure the file is a valid Excel (.xlsx, .xls) or CSV file'
      );
      resetState();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const downloadSampleTemplate = (format: 'xlsx' | 'csv') => {
    const sampleData = [
      {
        'Product Name': 'Full-Stack Web Development Bootcamp',
        'SKU': 'SKU-WEB-05',
        'Category': 'Software Development',
        'Cost Price': 18000,
        'Selling Price': 45000,
        'Description': 'Comprehensive live training covering TypeScript, React, Next.js, and Node.js',
        'Status': 'ACTIVE',
      },
      {
        'Product Name': 'Data Science & Machine Learning Pro',
        'SKU': 'SKU-DS-06',
        'Category': 'Data & AI',
        'Cost Price': 20000,
        'Selling Price': 55000,
        'Description': 'Deep dive into Python, Pandas, Scikit-Learn, and Neural Networks',
        'Status': 'ACTIVE',
      },
      {
        'Product Name': 'Digital Marketing Mastery',
        'SKU': 'SKU-MKT-07',
        'Category': 'Marketing',
        'Cost Price': 6000,
        'Selling Price': 22000,
        'Description': 'SEO, Performance Marketing, Meta Ads, and Growth Strategies',
        'Status': 'ACTIVE',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products Template');

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, 'SalesOS_Products_Import_Template.xlsx');
    } else {
      XLSX.writeFile(workbook, 'SalesOS_Products_Import_Template.csv', { bookType: 'csv' });
    }

    success('Template Downloaded', `Saved SalesOS_Products_Import_Template.${format}`);
  };

  const validRows = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);

  const displayedRows =
    filterView === 'valid'
      ? validRows
      : filterView === 'invalid'
      ? invalidRows
      : rows;

  const handleImport = async () => {
    if (validRows.length === 0) {
      toastError('No valid rows', 'Please ensure there are valid rows to import.');
      return;
    }

    try {
      setIsImporting(true);

      const itemsToImport: ProductInput[] = validRows.map((r) => ({
        name: r.name,
        sku: r.sku,
        category: r.category,
        cost: r.cost,
        selling_price: r.selling_price,
        description: r.description,
        status: r.status,
      }));

      await productsService.bulkCreate(orgId, itemsToImport);

      success(
        'Import Successful',
        `Successfully imported ${validRows.length} product${validRows.length > 1 ? 's' : ''} into catalog.`
      );

      handleClose(false);
      onSuccess();
    } catch (err: unknown) {
      console.error('Import error:', err);
      toastError(
        'Failed to import products',
        err instanceof Error ? err.message : 'An error occurred during import'
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Import Products from Excel</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Upload .xlsx, .xls, or .csv files to batch import courses, products, and catalog items.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={() => downloadSampleTemplate('xlsx')}
              >
                <Download className="w-3.5 h-3.5 text-primary" /> Download Excel Template
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* Upload Area */}
          {rows.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-border/80 hover:border-primary/60 hover:bg-muted/30 bg-card'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                <FileUp className="w-7 h-7" />
              </div>
              <h4 className="font-semibold text-base text-foreground mb-1">
                Drop your Excel spreadsheet here, or <span className="text-primary underline">browse</span>
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files. Headers like Name, SKU, Category, Cost, and Selling Price are auto-detected.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/50">
                <Info className="w-3.5 h-3.5 text-primary" />
                <span>Tip: Download the template above for perfectly mapped columns.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File Info & Summary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border/70 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                      {fileName}
                      {fileSize && (
                        <span className="text-xs text-muted-foreground font-normal">({fileSize})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{rows.length} total rows parsed</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {validRows.length} valid
                      </span>
                      {invalidRows.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-destructive font-medium">
                            {invalidRows.length} invalid
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-muted p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterView('all')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        filterView === 'all'
                          ? 'bg-background shadow-xs text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All ({rows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterView('valid')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        filterView === 'valid'
                          ? 'bg-background shadow-xs text-emerald-600'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Valid ({validRows.length})
                    </button>
                    {invalidRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterView('invalid')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          filterView === 'invalid'
                            ? 'bg-background shadow-xs text-destructive'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Errors ({invalidRows.length})
                      </button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Re-upload
                  </Button>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-border/70 rounded-xl overflow-hidden bg-card max-h-[360px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs">#</TableHead>
                      <TableHead className="text-xs">Product / Course</TableHead>
                      <TableHead className="text-xs">SKU</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs text-right">Cost (₹)</TableHead>
                      <TableHead className="text-xs text-right">Selling Price (₹)</TableHead>
                      <TableHead className="text-xs text-right">Margin</TableHead>
                      <TableHead className="text-xs text-center">Status</TableHead>
                      <TableHead className="text-xs text-center">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRows.map((row) => {
                      const margin = row.selling_price - row.cost;
                      const marginPct =
                        row.selling_price > 0
                          ? Math.round((margin / row.selling_price) * 100)
                          : 0;

                      return (
                        <TableRow
                          key={row.index}
                          className={!row.isValid ? 'bg-destructive/5 hover:bg-destructive/10' : ''}
                        >
                          <TableCell className="font-mono text-xs text-center text-muted-foreground">
                            {row.index}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-foreground">{row.name || '—'}</div>
                            {row.description && (
                              <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                                {row.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {row.sku}
                          </TableCell>
                          <TableCell className="text-xs">{row.category}</TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground font-mono">
                            {formatCurrency(row.cost)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-bold text-foreground font-mono">
                            {formatCurrency(row.selling_price)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            <span
                              className={
                                margin >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                  : 'text-destructive font-medium'
                              }
                            >
                              {formatCurrency(margin)} ({marginPct}%)
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {row.isValid ? (
                              <div className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Ready</span>
                              </div>
                            ) : (
                              <div
                                className="inline-flex items-center gap-1 text-[11px] text-destructive font-medium"
                                title={row.errors.join(', ')}
                              >
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="line-clamp-1 max-w-[120px] text-left">
                                  {row.errors[0]}
                                </span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/50 flex sm:justify-between items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {validRows.length > 0 ? (
              <span>
                Ready to import <strong className="text-foreground">{validRows.length}</strong> product{validRows.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span>Upload an Excel spreadsheet to begin</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleClose(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleImport}
              disabled={validRows.length === 0 || isImporting}
              className="gap-1.5"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {validRows.length > 0 ? `${validRows.length} Products` : ''}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
