import sql from '../src/db/index.js';

const cols = await sql`
  SELECT table_name, column_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('courses','tasks','teams','submissions','chat_rooms','task_assignments','task_team_assignments')
    AND column_name IN ('cohort_id','assignment_type','grade','feedback','assessed_by','assessed_at')
  ORDER BY table_name, column_name
`;
console.table(cols.map(r => ({ table: r.table_name, column: r.column_name, nullable: r.is_nullable })));

// Check if task_assignments and task_team_assignments exist
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('task_assignments','task_team_assignments','cohort_courses')
`;
console.log('\nJunction tables present:', tables.map(t => t.table_name).join(', ') || 'NONE');

await sql.end();
