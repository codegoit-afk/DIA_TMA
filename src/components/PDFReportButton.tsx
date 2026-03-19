"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { useUser } from "@/components/providers/TelegramProvider";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import { format } from "date-fns";
import { ru, uk, enUS } from "date-fns/locale";
import { robotoBase64 } from "@/lib/fonts/roboto-base64";

type PDFReportButtonProps = {
  period: 7 | 30;
};

export default function PDFReportButton({ period }: PDFReportButtonProps) {
  const { user, t, language } = useUser();
  const [isGenerating, setIsGenerating] = useState(false);

  const getLocale = () => {
    if (language === 'ua') return uk;
    if (language === 'en') return enUS;
    return ru;
  };

  const handleDownload = async () => {
    if (!user) return;
    setIsGenerating(true);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');

    try {
      const res = await axios.get(`/api/logs/all?telegram_id=${user.telegram_id}&days=${period}`);
      if (!res.data.success) throw new Error("Failed to fetch logs");

      const logs = res.data.logs;
      const doc = new jsPDF();
      const locale = getLocale();

      // Add Cyrillic Font
      doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.setFont("Roboto");

      // Header
      doc.setFontSize(22);
      doc.setTextColor(17, 24, 39); // Gray-900
      doc.text(t.pdf_report_title || "Diabetes Report", 20, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // Gray-500
      doc.text(`${t.pdf_patient_name}: ${user.first_name || user.username || 'Patient'}`, 20, 35);
      doc.text(`${t.pdf_report_period}: ${period} ${t.days_7.split(' ')[1]}`, 20, 42);

      // Simple Stats Summary
      const totalSugar = logs.reduce((acc: number, log: any) => acc + (log.current_sugar || 0), 0);
      const avgSugar = (totalSugar / logs.length).toFixed(1);
      
      doc.setFontSize(12);
      doc.setTextColor(52, 211, 153); // Emerald-400
      doc.text(`${t.avg_sugar}: ${avgSugar} mmol/L`, 20, 55);

      // Table Setup
      const tableData = logs.map((log: any) => {
        let items = "";
        try {
           if (log.ai_raw_response?.items_breakdown) {
             items = log.ai_raw_response.items_breakdown.map((i: any) => i.name).join(", ");
           }
        } catch (e) {}

        return [
          format(new Date(log.created_at), "dd.MM HH:mm", { locale }),
          log.current_sugar ? log.current_sugar.toFixed(1) : "-",
          log.total_xe ? log.total_xe.toFixed(1) : "-",
          log.actual_dose ? log.actual_dose.toFixed(1) : "-",
          items || ""
        ];
      });

      autoTable(doc, {
        startY: 65,
        styles: { font: 'Roboto', fontSize: 9 },
        head: [[
           language === 'en' ? 'Date' : language === 'ua' ? 'Дата' : 'Дата',
           language === 'en' ? 'Sugar' : language === 'ua' ? 'Цукор' : 'Сахар',
           language === 'en' ? 'XE' : language === 'ua' ? 'ХО' : 'ХЕ',
           language === 'en' ? 'Insulin' : language === 'ua' ? 'Інсулін' : 'Инсулин',
           language === 'en' ? 'Notes' : language === 'ua' ? 'Примітка' : 'Заметка'
        ]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [52, 211, 153], font: 'Roboto', fontStyle: 'normal' },
      });

      doc.save(`dia_ai_report_${period}_days.pdf`);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="w-full nm-outset nm-active bg-white p-6 rounded-[2rem] text-[#111827] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-sm hover:bg-emerald-50 transition-colors"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
      ) : (
        <FileText className="w-4 h-4 text-emerald-500" />
      )}
      {t.download_pdf}
    </button>
  );
}
