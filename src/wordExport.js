import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign, LevelFormat
} from 'docx'
import { saveAs } from 'file-saver'

const TEAL     = '2E7E8A'
const TEAL_LT  = 'E8F5F6'
const GREY     = 'F5F7F8'
const border   = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
const borders  = { top: border, bottom: border, left: border, right: border }

// ── helpers ──────────────────────────────────────────────
const fmtDate = d => d ? d.split('-').reverse().join('/') : ''

function tCell(text, opts = {}) {
  return new TableCell({
    borders,
    width: opts.w ? { size: opts.w, type: WidthType.DXA } : undefined,
    shading: opts.header  ? { fill: TEAL,   type: ShadingType.CLEAR }
           : opts.label   ? { fill: TEAL_LT, type: ShadingType.CLEAR }
           : opts.grey    ? { fill: GREY,    type: ShadingType.CLEAR }
           :                { fill: 'FFFFFF', type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({
        text:    String(text ?? ''),
        bold:    !!(opts.header || opts.bold),
        color:   opts.header ? 'FFFFFF' : '222222',
        size:    opts.header ? 20 : 18,
        font:    'Arial',
        italics: !!opts.italic
      })]
    })]
  })
}

function secHeader(no, title, isAr = false) {
  return new Paragraph({
    alignment: isAr ? AlignmentType.RIGHT : AlignmentType.LEFT,
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 1 } },
    children: [new TextRun({ text: `${no}  ${title}`, bold: true, color: TEAL, size: 22, font: 'Arial' })]
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER
             : opts.right  ? AlignmentType.RIGHT
             :               AlignmentType.LEFT,
    spacing: { after: opts.after ?? 80 },
    children: [new TextRun({
      text:    String(text ?? ''),
      bold:    !!opts.bold,
      italics: !!opts.italic,
      color:   opts.color ?? '222222',
      size:    opts.size  ?? 18,
      font:    'Arial'
    })]
  })
}

const gap = () => para('', { after: 40 })

// ── main export ───────────────────────────────────────────
export async function generateWordDoc(mom, mtg, proj, lang, meetingNo) {
  const isAr   = lang === 'ar'
  const al     = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT
  const momRef = `MOM-${(proj.name || '').slice(0, 3).toUpperCase()}-${String(meetingNo).padStart(3, '0')}`

  // Page width A4: 11906 DXA, margins 900 each side → content = 10106
  const W = 10106
  const half = Math.floor(W / 2)

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 200 } } } }]
      }]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 900, right: 900, bottom: 900, left: 900 }
        }
      },
      children: [
        // ── Cover / Title ─────────────────────────────────
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [W - 2800, 2800],
          borders: {
            top:    { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL },
            left:   { style: BorderStyle.NONE },
            right:  { style: BorderStyle.NONE },
            insideH:{ style: BorderStyle.NONE },
            insideV:{ style: BorderStyle.NONE },
          },
          rows: [new TableRow({ children: [
            new TableCell({
              borders: { top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE} },
              margins: { bottom: 120 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'IWAN ARCHITECTS', bold: true, color: TEAL, size: 40, font: 'Arial' })] }),
                new Paragraph({ children: [new TextRun({ text: isAr ? 'محضر اجتماع' : 'Minutes of Meeting', color: '555555', size: 20, font: 'Arial' })] }),
              ]
            }),
            new TableCell({
              borders: { top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE} },
              margins: { bottom: 120 },
              children: [
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: momRef, bold: true, size: 22, font: 'Arial' })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmtDate(mtg.date), color: '666666', size: 18, font: 'Arial' })] }),
              ]
            }),
          ]})]
        }),

        gap(),

        // ── 01 Meeting Details ────────────────────────────
        secHeader('01', isAr ? 'تفاصيل الاجتماع' : 'MEETING DETAILS', isAr),
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [1800, half - 1800, 1800, W - half - 1800],
          rows: [
            new TableRow({ children: [
              tCell(isAr ? 'اسم المشروع' : 'Project Name', { label: true, w: 1800 }),
              tCell(proj.name, { w: half - 1800 }),
              tCell(isAr ? 'العميل' : 'Client', { label: true, w: 1800 }),
              tCell(proj.client, { w: W - half - 1800 }),
            ]}),
            new TableRow({ children: [
              tCell(isAr ? 'التاريخ' : 'Date', { label: true, w: 1800 }),
              tCell(fmtDate(mtg.date), { w: half - 1800 }),
              tCell(isAr ? 'الوقت' : 'Time', { label: true, w: 1800 }),
              tCell(mtg.time, { w: W - half - 1800 }),
            ]}),
            new TableRow({ children: [
              tCell(isAr ? 'الموقع' : 'Location', { label: true, w: 1800 }),
              tCell(mtg.location, { w: half - 1800 }),
              tCell(isAr ? 'النوع' : 'Meeting Type', { label: true, w: 1800 }),
              tCell(mtg.mType, { w: W - half - 1800 }),
            ]}),
            new TableRow({ children: [
              tCell(isAr ? 'يرأسه' : 'Chaired By', { label: true, w: 1800 }),
              tCell(mtg.chaired, { w: half - 1800 }),
              tCell(isAr ? 'المحضر' : 'Minutes By', { label: true, w: 1800 }),
              tCell(mtg.minsBy, { w: W - half - 1800 }),
            ]}),
          ]
        }),

        gap(),

        // ── 02 Attendees ──────────────────────────────────
        secHeader('02', isAr ? 'الحضور' : 'ATTENDEES', isAr),
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [Math.floor(W/3), Math.floor(W/3), W - Math.floor(W/3)*2],
          rows: [
            new TableRow({ children: [
              tCell(isAr ? 'الاسم'    : 'Name',           { header: true, w: Math.floor(W/3) }),
              tCell(isAr ? 'الشركة'   : 'Company / Dept', { header: true, w: Math.floor(W/3) }),
              tCell(isAr ? 'الدور'    : 'Role',           { header: true, w: W - Math.floor(W/3)*2 }),
            ]}),
            ...(mtg.attendees || []).map(a => new TableRow({ children: [
              tCell(a.name,    { w: Math.floor(W/3) }),
              tCell(a.company, { w: Math.floor(W/3) }),
              tCell(a.role,    { w: W - Math.floor(W/3)*2 }),
            ]})),
          ]
        }),

        gap(),

        // ── 03 Objectives ─────────────────────────────────
        secHeader('03', isAr ? 'أهداف الاجتماع' : 'MEETING OBJECTIVES', isAr),
        ...(mom.objectives || []).map((o, i) => new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          alignment: al,
          children: [new TextRun({ text: o, size: 18, font: 'Arial' })]
        })),

        gap(),

        // ── 04 Executive Summary ──────────────────────────
        secHeader('04', isAr ? 'الملخص التنفيذي' : 'EXECUTIVE SUMMARY', isAr),
        para(mom.summary, { after: 160 }),

        // ── 05 Discussion ─────────────────────────────────
        secHeader('05', isAr ? 'المناقشة والقرارات' : 'DISCUSSION & DECISIONS', isAr),
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [400, 2200, 5006, 2500],
          rows: [
            new TableRow({ children: [
              tCell('#',                                            { header: true, w: 400,  center: true }),
              tCell(isAr ? 'الموضوع'            : 'Topic',        { header: true, w: 2200 }),
              tCell(isAr ? 'النقاط / القرارات'  : 'Key Points / Decisions', { header: true, w: 5006 }),
              tCell(isAr ? 'ملاحظات'            : 'Remarks',      { header: true, w: 2500 }),
            ]}),
            ...(mom.discussion || []).map((d, i) => new TableRow({ children: [
              tCell(i + 1,        { w: 400,  center: true }),
              tCell(d.topic,      { w: 2200 }),
              tCell(d.keyPoints,  { w: 5006 }),
              tCell(d.remarks,    { w: 2500 }),
            ]})),
          ]
        }),

        gap(),

        // ── 06 Action Items ───────────────────────────────
        secHeader('06', isAr ? 'بنود العمل' : 'ACTION ITEMS AGREED', isAr),
        para(
          isAr
            ? 'المهام التالية تم الاتفاق عليها. يتحمل كل مسؤول تنفيذ المهمة بحلول التاريخ المحدد.'
            : 'The following actions were agreed during the meeting. All owners are responsible for completing items by the due date.',
          { italic: true, color: '666666', after: 120 }
        ),
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [400, 4406, 1900, 1600, 1800],
          rows: [
            new TableRow({ children: [
              tCell('#',                                            { header: true, w: 400,  center: true }),
              tCell(isAr ? 'المهمة'       : 'Action Item',        { header: true, w: 4406 }),
              tCell(isAr ? 'المسؤول'     : 'Owner',              { header: true, w: 1900 }),
              tCell(isAr ? 'الاستحقاق'   : 'Due Date',           { header: true, w: 1600 }),
              tCell(isAr ? 'الحالة'      : 'Status',             { header: true, w: 1800 }),
            ]}),
            ...(mom.actions || []).map((a, i) => new TableRow({ children: [
              tCell(a.no || i + 1,  { w: 400,  center: true }),
              tCell(a.description,  { w: 4406 }),
              tCell(a.owner,        { w: 1900 }),
              tCell(a.due,          { w: 1600 }),
              tCell(a.status || (isAr ? 'مفتوح' : 'Open'), { w: 1800, bold: true }),
            ]})),
          ]
        }),

        gap(),

        // ── 07 AOB ────────────────────────────────────────
        secHeader('07', isAr ? 'متفرقات' : 'ANY OTHER BUSINESS', isAr),
        para(mom.aob || (isAr ? 'لا يوجد' : 'None.'), { after: 160 }),

        // ── 08 Next Meeting ───────────────────────────────
        secHeader('08', isAr ? 'الاجتماع القادم' : 'NEXT MEETING', isAr),
        para(mom.nextMeeting || (isAr ? 'يُحدد لاحقاً' : 'To be confirmed.'), { after: 200 }),

        // ── Sign-off ──────────────────────────────────────
        secHeader('09', isAr ? 'التوقيع والتوزيع' : 'SIGN-OFF & DISTRIBUTION', isAr),
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [Math.floor(W/2), W - Math.floor(W/2)],
          rows: [
            new TableRow({ children: [
              tCell(isAr ? 'أعده' : 'Prepared By', { label: true, w: Math.floor(W/2) }),
              tCell(mtg.minsBy || '', { w: W - Math.floor(W/2) }),
            ]}),
            new TableRow({ children: [
              tCell(isAr ? 'التاريخ' : 'Date', { label: true, w: Math.floor(W/2) }),
              tCell(fmtDate(mtg.date), { w: W - Math.floor(W/2) }),
            ]}),
          ]
        }),

        gap(), gap(),

        // ── Footer ────────────────────────────────────────
        para(
          isAr
            ? 'يُعدّ هذا المحضر دقيقاً ما لم تُقدَّم اعتراضات خطية خلال 5 أيام عمل من تاريخ التوزيع.'
            : 'These minutes are considered accurate unless written objections are received within 5 working days of distribution.',
          { italic: true, color: '888888', size: 16, center: true, after: 60 }
        ),
        para(
          isAr ? 'سري — للاستخدام الداخلي فقط  |  IWAN ARCHITECTS' : 'CONFIDENTIAL — For internal use only  |  IWAN ARCHITECTS',
          { italic: true, color: 'AAAAAA', size: 16, center: true }
        ),
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  const filename = `MOM_${(proj.name || '').replace(/\s+/g, '_')}_${fmtDate(mtg.date).replace(/\//g, '-')}.docx`
  saveAs(blob, filename)
}
