import { FileText } from 'lucide-react';
import type { OrderPaper } from '@/lib/api';
import { resolveMarbleImageUrl } from '@/lib/marble-image';

const labels = {
  ar: { title: 'ورقة المقاسات', open: 'فتح الملف' },
  fr: { title: 'Feuille des mesures', open: 'Ouvrir le fichier' },
};

export function OrderPapers({
  papers,
  lang,
}: {
  papers: OrderPaper[];
  lang: 'ar' | 'fr';
}) {
  if (papers.length === 0) return null;
  const t = labels[lang];
  return (
    <section className="soft-shadow card-line rounded-[11px] bg-white p-5 md:p-6">
      <h2 className="mb-4 text-sm font-bold">{t.title}</h2>
      <div className="space-y-3">
        {papers.map((paper) => {
          const url = resolveMarbleImageUrl(paper.url);
          const isPdf = paper.contentType === 'application/pdf' || /\.pdf$/i.test(paper.filename);
          return (
            <div key={paper.id} className="overflow-hidden rounded-lg border border-[#E7E5E0] bg-[#FBFAF8]">
              {isPdf ? (
                <iframe title={paper.filename || t.title} src={url} className="h-80 w-full bg-white" />
              ) : (
                <a href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className="max-h-96 w-full object-contain" />
                </a>
              )}
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border-t border-[#E7E5E0] px-3 py-2 text-[11px] font-semibold text-[#3A3D3F] hover:bg-white"
              >
                <FileText size={14} />
                <span className="truncate">{paper.filename || t.open}</span>
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
