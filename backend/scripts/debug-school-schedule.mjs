import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const NEIS_KEY = env.NEIS_KEY;
const ATPT = process.argv[2] || 'F10';
const SD_SCHUL = process.argv[3] || '7341080';
const GRADE = process.argv[4] || '1';
const FROM = process.argv[5] || '20251101';
const TO = process.argv[6] || '20251231';

const EXAM_PATTERN =
  /지필평가|중간고사|기말고사|형성평가|수행평가|학력평가|모의고사|원점수|성취도|단원평가|마무리평가|회고사|고사|차시험/i;

const GRADE_FIELD = {
  '1': 'ONE_GRADE_EVENT_YN',
  '2': 'TW_GRADE_EVENT_YN',
  '3': 'THREE_GRADE_EVENT_YN',
};

async function fetchAll() {
  const rows = [];
  for (let pIndex = 1; pIndex <= 20; pIndex++) {
    const url = new URL('https://open.neis.go.kr/hub/SchoolSchedule');
    url.searchParams.set('KEY', NEIS_KEY);
    url.searchParams.set('Type', 'json');
    url.searchParams.set('pIndex', String(pIndex));
    url.searchParams.set('pSize', '100');
    url.searchParams.set('ATPT_OFCDC_SC_CODE', ATPT);
    url.searchParams.set('SD_SCHUL_CODE', SD_SCHUL);
    url.searchParams.set('AA_FROM_YMD', FROM);
    url.searchParams.set('AA_TO_YMD', TO);

    const res = await fetch(url);
    const data = await res.json();
    if (data.RESULT?.CODE && data.RESULT.CODE !== 'INFO-000') {
      console.log('NEIS error:', data.RESULT);
      break;
    }

    const block = data.SchoolSchedule?.[1]?.row;
    if (!block?.length) break;
    rows.push(...block);
    if (block.length < 100) break;
  }
  return rows;
}

const rows = await fetchAll();
console.log(`SchoolSchedule rows: ${rows.length} (${ATPT}/${SD_SCHUL}, ${FROM}-${TO})`);

const examLike = rows.filter((r) => EXAM_PATTERN.test(r.EVENT_NM || ''));
console.log(`Exam-like rows (keyword): ${examLike.length}`);
for (const row of examLike.slice(0, 15)) {
  const field = GRADE_FIELD[GRADE];
  console.log({
    date: row.AA_YMD,
    title: row.EVENT_NM,
    category: row.SBTR_DD_SC_NM,
    gradeFlag: field ? row[field] : null,
    grades: {
      '1': row.ONE_GRADE_EVENT_YN,
      '2': row.TW_GRADE_EVENT_YN,
      '3': row.THREE_GRADE_EVENT_YN,
    },
  });
}

const gradeFiltered = examLike.filter((r) => r[GRADE_FIELD[GRADE]] === 'Y');
console.log(`Exam rows for grade ${GRADE} (Y only): ${gradeFiltered.length}`);

const sampleTitles = [...new Set(rows.map((r) => r.EVENT_NM).filter(Boolean))].slice(0, 30);
console.log('Sample EVENT_NM (first 30 unique):', sampleTitles);
