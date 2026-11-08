export type Comparison = {
  reviewed_count: number;
  preliminary?: boolean;
  rows: { field: string; values: Record<string, string | null>; status: string; note?: string; missing_in?: string[]; compared?: string[] }[];
  summary?: { sentence?: string; total?: number; match?: number; different?: number; partial_match?: number; cannot_compare?: number };
};
const fields: Record<string, string> = { mouza: 'মৌজা', jl_number: 'জে.এল. নম্বর', plot_number: 'দাগ নম্বর', khatian_number: 'খতিয়ান নম্বর', deed_number: 'দলিল নম্বর', mutation_number: 'নামজারি নম্বর', owner_name: 'মালিকের নাম', seller_name: 'বিক্রেতার নাম', buyer_name: 'ক্রেতার নাম', area: 'জমির পরিমাণ', survey_type: 'জরিপের ধরন' };
const statuses: Record<string, string> = {
  reference_only: 'শুধু পাশাপাশি দেখানো হয়েছে — স্বয়ংক্রিয় সমতা পরীক্ষা নয়',
  awaiting_review: 'তিন নথির ফল এখনও আসেনি',
  missing: 'তিন নথিতেই তথ্য নেই',
  incomplete: 'কিছু নথিতে তথ্য নেই',
  context_required: 'মৌজা, জে.এল. বা জরিপ অসম্পূর্ণ — তুলনা হয়নি',
  context_differs: 'মৌজা, জে.এল. বা জরিপ আলাদা — তুলনা হয়নি',
  unsupported_survey: 'জরিপের ধরন শনাক্ত হয়নি — তুলনা হয়নি',
  unit_review: 'পরিমাণ বা একক ভিন্ন/অস্পষ্ট — তুলনা হয়নি',
  match: 'মান মিলেছে',
  partial_match: 'আংশিক মিলেছে',
  format_differs: 'একই মান, বিন্যাস ভিন্ন',
  different: 'মান ভিন্ন — যাচাই করুন',
};

export function CaseComparison({ data }: { data: Comparison }) {
  return <section className="panel" style={{ padding: 20, margin: '24px 0' }} aria-label="তিন নথির তুলনা">
    <h3>তিন নথির তথ্য তুলনা{data.preliminary ? ' · স্বয়ংক্রিয় প্রাথমিক ফল' : ' · যাচাইকৃত তথ্য'}</h3>
    <p>{data.preliminary ? 'নথি থেকে পাওয়া তথ্য স্বয়ংক্রিয়ভাবে তুলনা করা হয়েছে। হাতের লেখা বা অস্পষ্ট সংখ্যায় ভুল থাকতে পারে।' : 'আপনার সংরক্ষিত সংশোধন ব্যবহার করা হয়েছে।'}</p>
    <p>মান মেলা নথির সত্যতা প্রমাণ করে না; ভিন্ন মানও জালিয়াতির সিদ্ধান্ত নয়।</p>
    {data.summary?.sentence && <p style={{ fontWeight: 600, margin: '12px 0' }}>{data.summary.sentence}</p>}
    <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="নথির তুলনা টেবিল">
      <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
        <caption style={{ textAlign: 'left', paddingBottom: 12 }}>
          বাংলা ও ইংরেজি সংখ্যা এবং অতিরিক্ত ফাঁক সমন্বয় করে তুলনা করা হয়; নম্বরের শুরুর শূন্য রাখা হয়।
          দাগের তালিকা অংশ হিসেবে মেলানো হয়, এবং দাগ ও পরিমাণ কেবল একই মৌজা, জে.এল. ও জরিপে তুলনা করা হয়।
        </caption>
        <thead><tr>{['তথ্য', 'দলিল', 'নামজারি', 'খতিয়ান', 'অবস্থা'].map(label => <th scope="col" key={label} style={{ textAlign: 'left', padding: 10 }}>{label}</th>)}</tr></thead>
        <tbody>{data.rows.map(row => <tr key={row.field} style={{ borderTop: '1px solid #dce3dd', verticalAlign: 'top' }}>
          <th scope="row" style={{ textAlign: 'left', padding: 10 }}>{fields[row.field]}</th>
          {['deed', 'mutation', 'khatian'].map(kind => <td key={kind} style={{ padding: 10, overflowWrap: 'anywhere', maxWidth: 180 }}>{row.values[kind] === null ? 'ফল আসেনি' : row.values[kind] || 'নিশ্চিত পাঠ পাওয়া যায়নি'}</td>)}
          <td style={{ padding: 10, maxWidth: 260 }}>
            {statuses[row.status] ?? row.status}
            {row.note && <small style={{ display: 'block', marginTop: 4, color: '#4a5a50', lineHeight: 1.5 }}>{row.note}</small>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>
    <p>নাম এবং বিভিন্ন রেকর্ডের নিজস্ব নম্বর শুধু পাশাপাশি দেখানো হয়। এগুলো থেকে মালিকানার ধারাবাহিকতা অনুমান করা হয় না।</p>
    <p>একক রূপান্তর করা হয় না; ভিন্ন একক বা অসম্পূর্ণ ভিত্তিতে দাগ ও পরিমাণ তুলনা বন্ধ রাখা হয়।</p>
  </section>;
}
