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
  console.log('Connected to PostgreSQL.');

  // Find org id
  const { rows: orgs } = await client.query('SELECT id FROM public.organizations LIMIT 1');
  const orgId = orgs[0]?.id || '11111111-1111-1111-1111-111111111111';

  // Find manager profile (Adhesh Krishna or Jitto Vadukkoot or Org Admin)
  const { rows: managers } = await client.query(`
    SELECT id, email, first_name, last_name, role FROM public.profiles 
    WHERE role IN ('ORG_ADMIN', 'MANAGER') 
    ORDER BY created_at ASC
  `);
  const primaryManager = managers.find(m => m.email === 'realadheshkrishna@gmail.com') || managers[0];
  console.log('Primary Manager:', primaryManager ? `${primaryManager.first_name} ${primaryManager.last_name} (${primaryManager.id})` : 'None');

  // Find sales reps
  const { rows: reps } = await client.query(`
    SELECT id, email, first_name, last_name, role, employee_id FROM public.profiles 
    WHERE role = 'SALES_REP' 
    ORDER BY employee_id ASC
  `);
  console.log(`Found ${reps.length} sales reps:`, reps.map(r => `${r.employee_id}: ${r.first_name}`).join(', '));

  // 1. Ensure Telecalling Team exists and is configured
  let teleTeamId;
  const { rows: existingTele } = await client.query(`
    SELECT id FROM public.teams WHERE name ILIKE '%telecall%' AND organization_id = $1 LIMIT 1
  `, [orgId]);

  if (existingTele.length > 0) {
    teleTeamId = existingTele[0].id;
    await client.query(`
      UPDATE public.teams
      SET name = 'Telecalling Team',
          description = 'Responsible for contacting new leads, understanding customer requirements, qualifying leads, follow-ups, CRM updates and appointment setting.',
          team_type = 'Telecalling / Lead Qualification',
          manager_id = $1,
          status = 'ACTIVE',
          target_value = 150,
          target_type = 'QUALIFIED_LEADS',
          target_period = 'MONTHLY',
          updated_at = NOW()
      WHERE id = $2
    `, [primaryManager?.id || null, teleTeamId]);
    console.log('Updated Telecalling Team:', teleTeamId);
  } else {
    const { rows: newTele } = await client.query(`
      INSERT INTO public.teams (organization_id, name, description, team_type, manager_id, status, target_value, target_type, target_period)
      VALUES ($1, 'Telecalling Team', 'Responsible for contacting new leads, understanding customer requirements, qualifying leads, follow-ups, CRM updates and appointment setting.', 'Telecalling / Lead Qualification', $2, 'ACTIVE', 150, 'QUALIFIED_LEADS', 'MONTHLY')
      RETURNING id
    `, [orgId, primaryManager?.id || null]);
    teleTeamId = newTele[0].id;
    console.log('Created Telecalling Team:', teleTeamId);
  }

  // 2. Ensure Sales Closing Team exists and is configured
  let closingTeamId;
  const { rows: existingClosing } = await client.query(`
    SELECT id FROM public.teams WHERE (name ILIKE '%closing%' OR name ILIKE '%sales team%') AND organization_id = $1 LIMIT 1
  `, [orgId]);

  if (existingClosing.length > 0) {
    closingTeamId = existingClosing[0].id;
    await client.query(`
      UPDATE public.teams
      SET name = 'Sales Closing Team',
          description = 'Responsible for receiving qualified leads, explaining packages, conducting consultations, product demonstrations, handling objections, following up and closing sales.',
          team_type = 'Sales Closing / Deal Execution',
          manager_id = $1,
          status = 'ACTIVE',
          target_value = 500000,
          target_type = 'REVENUE',
          target_period = 'MONTHLY',
          updated_at = NOW()
      WHERE id = $2
    `, [primaryManager?.id || null, closingTeamId]);
    console.log('Updated Sales Closing Team:', closingTeamId);
  } else {
    const { rows: newClosing } = await client.query(`
      INSERT INTO public.teams (organization_id, name, description, team_type, manager_id, status, target_value, target_type, target_period)
      VALUES ($1, 'Sales Closing Team', 'Responsible for receiving qualified leads, explaining packages, conducting consultations, product demonstrations, handling objections, following up and closing sales.', 'Sales Closing / Deal Execution', $2, 'ACTIVE', 500000, 'REVENUE', 'MONTHLY')
      RETURNING id
    `, [orgId, primaryManager?.id || null]);
    closingTeamId = newClosing[0].id;
    console.log('Created Sales Closing Team:', closingTeamId);
  }

  // Remove or deactivate any duplicate "team sales"
  await client.query(`
    UPDATE public.teams SET status = 'INACTIVE' WHERE name ILIKE 'team sales' AND id NOT IN ($1, $2)
  `, [teleTeamId, closingTeamId]);

  // 3. Assign members according to required structure:
  // Telecalling Team: 3 Telecallers / Lead Qualification Executives
  // (Assign reps[0], reps[1], reps[2] if available)
  if (reps.length >= 1) {
    await client.query(`UPDATE public.profiles SET team_id = $1 WHERE id = $2`, [teleTeamId, reps[0].id]);
    await client.query(`UPDATE public.employee_invitations SET team_id = $1 WHERE user_id = $2 OR email = $3`, [teleTeamId, reps[0].id, reps[0].email]);
  }
  if (reps.length >= 2) {
    await client.query(`UPDATE public.profiles SET team_id = $1 WHERE id = $2`, [teleTeamId, reps[1].id]);
    await client.query(`UPDATE public.employee_invitations SET team_id = $1 WHERE user_id = $2 OR email = $3`, [teleTeamId, reps[1].id, reps[1].email]);
  }
  if (reps.length >= 3) {
    await client.query(`UPDATE public.profiles SET team_id = $1 WHERE id = $2`, [closingTeamId, reps[2].id]);
    await client.query(`UPDATE public.employee_invitations SET team_id = $1 WHERE user_id = $2 OR email = $3`, [closingTeamId, reps[2].id, reps[2].email]);
  }
  // If Jitto Vadukkoot (manager) or another member can also be closer:
  const secondManager = managers.find(m => m.id !== primaryManager?.id);
  if (secondManager) {
    await client.query(`UPDATE public.profiles SET team_id = $1 WHERE id = $2`, [closingTeamId, secondManager.id]);
  }

  console.log('\n--- Final Structure ---');
  const { rows: allTeams } = await client.query(`
    SELECT t.id, t.name, t.team_type, t.status, t.target_value, t.target_type, t.target_period,
           p.first_name || ' ' || p.last_name as manager_name,
           (SELECT COUNT(*) FROM public.profiles WHERE team_id = t.id) as member_count
    FROM public.teams t
    LEFT JOIN public.profiles p ON t.manager_id = p.id
    WHERE t.status = 'ACTIVE'
    ORDER BY t.name
  `);
  console.table(allTeams);

  const { rows: teamReps } = await client.query(`
    SELECT p.employee_id, p.first_name || ' ' || p.last_name as name, p.role, t.name as team_name
    FROM public.profiles p
    LEFT JOIN public.teams t ON p.team_id = t.id
    ORDER BY t.name, p.employee_id
  `);
  console.table(teamReps);

  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

