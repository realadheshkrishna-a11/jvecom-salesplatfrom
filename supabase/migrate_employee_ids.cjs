const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.qkwxsiezhyarpcfnbjja',
  password: 'yKhs50xrj31U4ljR',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  // Fetch all profiles ordered by created_at (oldest first, so first created gets EMP-100)
  const { rows: profiles } = await client.query(`
    SELECT id, email, first_name, last_name, role, employee_id, created_at
    FROM public.profiles
    ORDER BY created_at ASC
  `);

  console.log(`Found ${profiles.length} profiles.`);

  let startNum = 100;
  for (const prof of profiles) {
    const newEmpId = `EMP-${startNum}`;
    console.log(`Updating profile ${prof.email || prof.id} (${prof.first_name} ${prof.last_name}): current="${prof.employee_id}" -> new="${newEmpId}"`);
    
    await client.query(`
      UPDATE public.profiles
      SET employee_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [newEmpId, prof.id]);

    // Also update any matching invitation
    if (prof.email) {
      await client.query(`
        UPDATE public.employee_invitations
        SET employee_id_str = $1
        WHERE LOWER(email) = LOWER($2) OR user_id = $3
      `, [newEmpId, prof.email, prof.id]);
    }

    startNum++;
  }

  // Also check if there are any invitations for users not yet in profiles
  const { rows: invitations } = await client.query(`
    SELECT id, email, first_name, last_name, role, employee_id_str, created_at
    FROM public.employee_invitations
    WHERE email NOT IN (SELECT email FROM public.profiles WHERE email IS NOT NULL)
    ORDER BY created_at ASC
  `);

  for (const inv of invitations) {
    const newEmpId = `EMP-${startNum}`;
    console.log(`Updating unlinked invitation ${inv.email}: current="${inv.employee_id_str}" -> new="${newEmpId}"`);
    await client.query(`
      UPDATE public.employee_invitations
      SET employee_id_str = $1
      WHERE id = $2
    `, [newEmpId, inv.id]);
    startNum++;
  }

  console.log('\n--- Final Verification ---');
  const { rows: updatedProfiles } = await client.query(`
    SELECT id, email, first_name, last_name, role, employee_id, created_at
    FROM public.profiles
    ORDER BY employee_id ASC
  `);
  console.table(updatedProfiles.map(p => ({
    id: p.id,
    employee_id: p.employee_id,
    name: `${p.first_name} ${p.last_name}`,
    email: p.email,
    role: p.role
  })));

  const { rows: updatedInvs } = await client.query(`
    SELECT id, email, first_name, last_name, employee_id_str, status
    FROM public.employee_invitations
    ORDER BY employee_id_str ASC
  `);
  console.table(updatedInvs.map(i => ({
    email: i.email,
    employee_id_str: i.employee_id_str,
    name: `${i.first_name} ${i.last_name}`,
    status: i.status
  })));

  await client.end();
  console.log('Migration completed successfully.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
