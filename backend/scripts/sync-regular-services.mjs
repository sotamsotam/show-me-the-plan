import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function transform(content, file) {
  let c = content
    .replace(/@\/lib\/exam-countdown/g, './exam-countdown')
    .replace(/@\/lib\/vacation-period-settings/g, './vacation-period-settings')
    .replace(/@\/lib\/vacation-week-date-range/g, './vacation-week-date-range')
    .replace(/@\/lib\/school-term-periods/g, './school-term-periods')
    .replace(/@\/lib\/regular-period-segments/g, './regular-period-segments')
    .replace(/@\/lib\/regular-weekly-plan/g, './regular-weekly-plan')
    .replace(/@\/lib\/weekly-plan-item/g, './weekly-plan-item')
    .replace(/@\/lib\/user-subject/g, './user-subject');

  if (file === 'regular-weekly-plan.ts') {
    c = c.replace(/\nexport interface RegularWeeklyPlansContextResponse[\s\S]*$/m, '');
    c = c.replace(
      /\nexport function previewItemToRegularPeriodFromPreview[\s\S]*?(?=\nexport function validateRegularWeeklyPlansInput)/m,
      ''
    );
  }

  if (file === 'regular-weekly-plan-template.ts') {
    c = `import { randomUUID } from 'node:crypto';\n\n${c}`;
    c = c.replace(
      /id:\s*\n\s*typeof crypto !== 'undefined' && 'randomUUID' in crypto\s*\? crypto\.randomUUID\(\)\s*:\s*`template-\$\{Date\.now\(\)\}-\$\{Math\.random\(\)\.toString\(36\)\.slice\(2, 10\)\}`,/m,
      'id: randomUUID(),'
    );
  }

  return c;
}

for (const file of [
  'regular-period-segments.ts',
  'regular-weekly-plan.ts',
  'regular-weekly-plan-template.ts',
]) {
  const src = path.join(root, 'frontend/src/lib', file);
  const dst = path.join(root, 'backend/src/services', file);
  const content = fs.readFileSync(src, 'utf8');
  fs.writeFileSync(dst, transform(content, file), 'utf8');
  console.log(`wrote ${dst}`);
}
