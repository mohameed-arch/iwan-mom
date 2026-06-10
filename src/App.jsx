import { useState, useEffect, useRef, useCallback } from 'react'
import { getProjects, createProject, deleteProject, getMeetings, createMeeting, updateMeeting, deleteMeeting } from './db.js'
import { generateMOM } from './aiGenerate.js'
import { generateWordDoc } from './wordExport.js'

// ── Constants ─────────────────────────────────────────────
const TEAL     = '#2E7E8A'
const TEAL_LT  = '#e8f5f6'
const TEAL_MID = '#1e5f69'

const uid      = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const today    = () => new Date().toISOString().slice(0, 10)
const nowTime  = () => new Date().toTimeString().slice(0, 5)
const fmtDate  = d => d ? d.split('-').reverse().join('/') : ''

// ── Translations ──────────────────────────────────────────
const T = {
  en: {
    dir: 'ltr',
    appTitle: 'MOM — Minutes of Meeting',
    newProject: '+ New Project', newMeeting: '+ New Meeting',
    projectName: 'Project Name', clientName: 'Client Name', projectType: 'Project Type',
    projectTypes: ['Residential Villa', 'Commercial', 'Interior Design', 'Urban Planning', 'Renovation', 'Other'],
    save: 'Save', cancel: 'Cancel', back: '← Back', delete: 'Delete',
    noProjects: 'No projects yet — create your first one.',
    noMeetings: 'No meetings yet — start a new one.',
    date: 'Meeting Date', time: 'Time', location: 'Location / Platform',
    mType: 'Meeting Type',
    mTypes: ['Design Review', 'Site Visit', 'Client Presentation', 'Internal', 'Kick-off', 'Progress Update', 'Other'],
    chaired: 'Chaired By', minsBy: 'Minutes By', nextMtg: 'Next Meeting Date',
    attendees: 'Attendees', name: 'Name', company: 'Company / Dept', role: 'Role',
    addAttendee: '+ Add attendee',
    objectives: 'Meeting Objectives', objPh: 'What is this meeting about?',
    notes: '⚡ Quick Notes',
    notesHint: 'Type rough & fast — AI will organise everything into a professional MOM.',
    notesPh: 'Decisions, issues, ideas, approvals, anything discussed…',
    actions: 'Action Items', addAction: '+ Add action',
    action: 'Action', owner: 'Owner', due: 'Due Date',
    aob: 'Any Other Business', aobPh: 'Any other points raised…',
    generate: 'Generate MOM  ✦  AI', generating: 'Generating…',
    viewMOM: 'View MOM →', editBack: '← Back to Notes',
    dlWord: '⬇  Download Word (.docx)', dlPDF: '🖨  Print / Save PDF',
    meetingNo: 'Meeting', momReady: 'MOM ready ✓',
    langLabel: 'Language', loading: 'Loading…',
    errGenerate: 'Generation failed. Make sure the Quick Notes field has content and try again.',
    saving: 'Saving…', saved: 'Saved ✓',
    statusOpen: 'Open', confidential: 'CONFIDENTIAL — For internal use only',
    delProject: 'Delete this project and ALL its meetings?',
    delMeeting: 'Delete this meeting?',
  },
  ar: {
    dir: 'rtl',
    appTitle: 'محضر اجتماع',
    newProject: '+ مشروع جديد', newMeeting: '+ اجتماع جديد',
    projectName: 'اسم المشروع', clientName: 'اسم العميل', projectType: 'نوع المشروع',
    projectTypes: ['فيلا سكنية', 'تجاري', 'تصميم داخلي', 'تخطيط عمراني', 'ترميم', 'أخرى'],
    save: 'حفظ', cancel: 'إلغاء', back: 'رجوع →', delete: 'حذف',
    noProjects: 'لا توجد مشاريع بعد.',
    noMeetings: 'لا توجد اجتماعات بعد.',
    date: 'تاريخ الاجتماع', time: 'الوقت', location: 'الموقع / المنصة',
    mType: 'نوع الاجتماع',
    mTypes: ['مراجعة تصميم', 'زيارة موقع', 'عرض على العميل', 'داخلي', 'اجتماع انطلاق', 'تحديث تقدم', 'أخرى'],
    chaired: 'يرأسه', minsBy: 'المحضر بواسطة', nextMtg: 'الاجتماع القادم',
    attendees: 'الحضور', name: 'الاسم', company: 'الشركة / القسم', role: 'الدور',
    addAttendee: '+ إضافة حاضر',
    objectives: 'أهداف الاجتماع', objPh: 'ما هو موضوع الاجتماع؟',
    notes: '⚡ ملاحظات سريعة',
    notesHint: 'اكتب بسرعة — الذكاء الاصطناعي سينظم كل شيء إلى محضر احترافي.',
    notesPh: 'القرارات، المشاكل، الأفكار، الاعتمادات، أي شيء مناقَش…',
    actions: 'بنود العمل', addAction: '+ إضافة مهمة',
    action: 'المهمة', owner: 'المسؤول', due: 'تاريخ الاستحقاق',
    aob: 'متفرقات', aobPh: 'أي نقاط أخرى أُثيرت…',
    generate: 'توليد المحضر  ✦  AI', generating: 'جارٍ التوليد…',
    viewMOM: 'عرض المحضر ←', editBack: 'العودة للملاحظات →',
    dlWord: '⬇  تنزيل Word (.docx)', dlPDF: '🖨  طباعة / حفظ PDF',
    meetingNo: 'اجتماع', momReady: 'المحضر جاهز ✓',
    langLabel: 'اللغة', loading: 'جارٍ التحميل…',
    errGenerate: 'فشل التوليد. تأكد من وجود محتوى في الملاحظات السريعة وحاول مجدداً.',
    saving: 'جارٍ الحفظ…', saved: 'تم الحفظ ✓',
    statusOpen: 'مفتوح', confidential: 'سري — للاستخدام الداخلي فقط',
    delProject: 'حذف هذا المشروع وجميع اجتماعاته؟',
    delMeeting: 'حذف هذا الاجتماع؟',
  }
}

// ── Styles ────────────────────────────────────────────────
const S = {
  wrap:    { fontFamily: 'Arial, sans-serif', maxWidth: 780, margin: '0 auto', padding: '1rem 1rem 4rem' },
  topbar:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${TEAL}`, paddingBottom: 10, marginBottom: 20 },
  card:    { background: '#fff', border: '1px solid #e0e6e8', borderRadius: 10, padding: '1rem 1.25rem' },
  primary: { background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' },
  ghost:   { background: 'none', color: '#555', border: '1px solid #ccd4d6', borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontSize: 13 },
  danger:  { background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 16, padding: '2px 8px' },
  dashed:  { background: 'none', border: `1px dashed ${TEAL}`, color: TEAL, borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 12, marginTop: 4 },
  input:   { width: '100%', boxSizing: 'border-box', padding: '7px 10px', border: '1px solid #d0d8da', borderRadius: 6, fontSize: 14, background: '#fff', color: '#1a1a1a', outline: 'none', fontFamily: 'inherit', display: 'block' },
  label:   { fontSize: 12, color: '#666', fontWeight: 'bold', marginBottom: 4, display: 'block' },
  sec:     { fontWeight: 'bold', fontSize: 12, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${TEAL_LT}`, paddingBottom: 4, marginBottom: 10, marginTop: 20 },
}

// ─────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]         = useState('en')
  const [view, setView]         = useState('projects')
  const [projects, setProjects] = useState([])
  const [meetings, setMeetings] = useState([])
  const [proj, setProj]         = useState(null)
  const [mtg,  setMtg]          = useState(null)
  const [mom,  setMom]          = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [saved,   setSaved]     = useState(false)
  const [generating, setGen]    = useState(false)
  const [genError, setGenErr]   = useState(null)
  const [showNewProj, setNewProj] = useState(false)
  const [apiKey, setApiKey]       = useState(() => localStorage.getItem('anthropic_key') || '')
  const [showKeyModal, setKeyModal] = useState(false)
  const saveTimer = useRef(null)
  const t = T[lang]

  // Load projects on mount
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000)
    getProjects()
      .then(ps => { setProjects(ps); setLoading(false) })
      .catch(() => setLoading(false))
      .finally(() => clearTimeout(timeout))
  }, [])

  // Load meetings when project changes
  useEffect(() => {
    if (!proj) return
    getMeetings(proj.id).then(ms => setMeetings(ms))
  }, [proj])

  const meetingNo = mid => {
    const idx = meetings.findIndex(m => m.id === mid)
    return meetings.length - idx
  }

  // ── Navigation ──────────────────────────────────────────
  function goBack() {
    if (view === 'editor' || view === 'mom') {
      setView('meetings'); setMtg(null); setMom(null); setGenErr(null)
    } else {
      setView('projects'); setProj(null); setMeetings([])
    }
  }

  // ── Projects ────────────────────────────────────────────
  async function handleCreateProject(data) {
    setLoading(true)
    const id = await createProject(data)
    const updated = await getProjects()
    setProjects(updated)
    const p = updated.find(x => x.id === id)
    setProj(p); setView('meetings'); setNewProj(false); setLoading(false)
  }

  async function handleDeleteProject(pid) {
    if (!confirm(t.delProject)) return
    await deleteProject(pid)
    setProjects(ps => ps.filter(p => p.id !== pid))
    setView('projects'); setProj(null)
  }

  // ── Meetings ────────────────────────────────────────────
  async function handleCreateMeeting() {
    const data = {
      projectId: proj.id, lang,
      date: today(), time: nowTime(),
      location: 'IWAN Architects Office',
      mType: t.mTypes[0],
      chaired: '', minsBy: '', nextMtg: '',
      attendees: [], objectives: '',
      notes: '', actions: [], aob: '', mom: null
    }
    const id = await createMeeting(data)
    const m = { id, ...data }
    setMeetings(ms => [m, ...ms])
    setMtg(m); setMom(null); setView('editor')
  }

  async function handleDeleteMeeting(mid) {
    if (!confirm(t.delMeeting)) return
    await deleteMeeting(mid)
    setMeetings(ms => ms.filter(m => m.id !== mid))
    goBack()
  }

  // Debounced save — waits 1.5s after last keystroke
  const saveMeeting = useCallback((updated) => {
    setMtg(updated)
    setMeetings(ms => ms.map(m => m.id === updated.id ? updated : m))
    clearTimeout(saveTimer.current)
    setSaved(false); setSaving(true)
    saveTimer.current = setTimeout(async () => {
      const { id, ...data } = updated
      await updateMeeting(id, data)
      setSaving(false); setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 1500)
  }, [])

  // ── AI Generate ─────────────────────────────────────────
  async function handleGenerate() {
    if (!mtg?.notes?.trim()) return
    if (!apiKey) { setKeyModal(true); return }
    setGen(true); setGenErr(null)
    try {
      const result = await generateMOM(mtg, proj, mtg.lang || lang, apiKey)
      const updated = { ...mtg, mom: result }
      saveMeeting(updated)
      setMom(result); setView('mom')
    } catch (e) {
      setGenErr(t.errGenerate + ' (' + e.message + ')')
    }
    setGen(false)
  }

  // ── PDF export ──────────────────────────────────────────
  function handlePDF() {
    const el = document.getElementById('mom-print-body')
    if (!el) return
    const isAr = (mtg.lang || lang) === 'ar'
    const w = window.open('', '_blank', 'width=900,height=700')
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>MOM - ${proj.name}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:15mm;font-size:9.5pt;color:#222;direction:${isAr ? 'rtl' : 'ltr'}}
        h1{font-size:18pt;color:#2E7E8A;margin:0 0 2px}
        .sub{font-size:10pt;color:#666;margin:0 0 14px}
        hr{border:none;border-bottom:2.5px solid #2E7E8A;margin:0 0 16px}
        .sec{font-size:10pt;font-weight:bold;color:#2E7E8A;border-bottom:1px solid #c5e4e7;padding-bottom:3px;margin:14px 0 7px;text-transform:uppercase;letter-spacing:.05em}
        table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:8.5pt}
        th{background:#2E7E8A;color:#fff;padding:5px 8px;text-align:${isAr ? 'right' : 'left'}}
        td{padding:4px 8px;border:.5px solid #ccc;vertical-align:top}
        .lbl{background:#e8f5f6;font-weight:bold}
        .footer{font-size:7.5pt;color:#999;text-align:center;margin-top:20px;border-top:.5px solid #ddd;padding-top:7px}
        .summary{background:#f9f9f9;border-left:3px solid #2E7E8A;padding:8px 12px;font-size:9pt;line-height:1.7;margin-bottom:10px}
        @page{margin:15mm} @media print{body{margin:0}}
      </style></head><body>
      ${el.innerHTML}
      </body></html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 400)
  }

  // ── Word export ─────────────────────────────────────────
  async function handleWord() {
    try {
      await generateWordDoc(mom, mtg, proj, mtg.lang || lang, meetingNo(mtg.id))
    } catch (e) {
      alert('Word export error: ' + e.message)
    }
  }

  // ── Render ───────────────────────────────────────────────
  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>{t.loading}</div>

  return (
    <div style={S.wrap}>
      {/* Top bar */}
      <div style={S.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {view !== 'projects' && <button onClick={goBack} style={S.ghost}>{t.back}</button>}
          <span style={{ fontWeight: 'bold', fontSize: 16, color: TEAL }}>{t.appTitle}</span>
          {proj && <span style={{ color: '#aaa', fontSize: 12 }}>/ {proj.name}</span>}
          {mtg  && <span style={{ color: '#aaa', fontSize: 12 }}>/ {fmtDate(mtg.date)}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saving && <span style={{ fontSize: 11, color: '#888' }}>{t.saving}</span>}
          {saved  && <span style={{ fontSize: 11, color: TEAL_MID }}>{t.saved}</span>}
          <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
            style={{ ...S.ghost, fontSize: 12, padding: '3px 10px' }}>
            {lang === 'en' ? 'عربي' : 'English'}
          </button>
          <button onClick={() => setKeyModal(true)} title="API Key settings"
            style={{ ...S.ghost, fontSize: 15, padding: '3px 9px', color: apiKey ? TEAL : '#e07000', borderColor: apiKey ? '#ccd4d6' : '#e07000' }}>
            ⚙
          </button>
          {view === 'projects' && <button onClick={() => setNewProj(true)} style={S.primary}>{t.newProject}</button>}
          {view === 'meetings' && <button onClick={handleCreateMeeting} style={S.primary}>{t.newMeeting}</button>}
        </div>
      </div>

      {/* Views */}
      {view === 'projects' && (
        <ProjectsView
          projects={projects} t={t} lang={lang}
          showNew={showNewProj}
          onNewSave={handleCreateProject}
          onNewCancel={() => setNewProj(false)}
          onOpen={p => { setProj(p); setView('meetings') }}
          onDelete={handleDeleteProject}
        />
      )}

      {view === 'meetings' && (
        <MeetingsView
          meetings={meetings} t={t}
          meetingNo={meetingNo}
          onOpen={m => { setMtg(m); setMom(m.mom || null); setView(m.mom ? 'mom' : 'editor') }}
          onDelete={handleDeleteMeeting}
        />
      )}

      {view === 'editor' && mtg && (
        <MeetingEditor
          mtg={mtg} t={T[mtg.lang || lang]}
          globalLang={lang}
          onChange={saveMeeting}
          onGenerate={handleGenerate}
          generating={generating}
          genError={genError}
          hasMom={!!mtg.mom}
          onViewMom={() => setView('mom')}
        />
      )}

      {view === 'mom' && mom && (
        <MOMView
          mom={mom} mtg={mtg} proj={proj}
          lang={mtg.lang || lang}
          t={T[mtg.lang || lang]}
          meetingNo={meetingNo(mtg.id)}
          onBack={() => setView('editor')}
          onWord={handleWord}
          onPDF={handlePDF}
        />
      )}

      {showKeyModal && (
        <ApiKeyModal
          current={apiKey}
          onSave={key => { setApiKey(key); localStorage.setItem('anthropic_key', key); setKeyModal(false) }}
          onClose={() => setKeyModal(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Projects View
// ─────────────────────────────────────────────────────────
function ProjectsView({ projects, t, lang, showNew, onNewSave, onNewCancel, onOpen, onDelete }) {
  return (
    <div dir={t.dir}>
      {showNew && <NewProjectForm t={t} lang={lang} onSave={onNewSave} onCancel={onNewCancel} />}
      {!projects.length && !showNew
        ? <Empty msg={t.noProjects} />
        : <div style={{ display: 'grid', gap: 10 }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => onOpen(p)}
                style={{ ...S.card, borderLeft: `3px solid ${TEAL}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{p.client} · {p.type}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); onDelete(p.id) }} style={S.danger} title={t.delete}>✕</button>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// New Project Form
// ─────────────────────────────────────────────────────────
function NewProjectForm({ t, lang, onSave, onCancel }) {
  const [name, setName]     = useState('')
  const [client, setClient] = useState('')
  const [type, setType]     = useState(t.projectTypes[0])
  return (
    <div style={{ ...S.card, border: `1.5px solid ${TEAL}`, marginBottom: 16 }} dir={t.dir}>
      <div style={{ fontWeight: 'bold', color: TEAL, marginBottom: 12 }}>{t.newProject}</div>
      <div style={{ display: 'grid', gap: 10 }}>
        <Field label={t.projectName}><input value={name}   onChange={e => setName(e.target.value)}   style={S.input} /></Field>
        <Field label={t.clientName}> <input value={client} onChange={e => setClient(e.target.value)} style={S.input} /></Field>
        <Field label={t.projectType}>
          <select value={type} onChange={e => setType(e.target.value)} style={S.input}>
            {t.projectTypes.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => onSave({ name, client, type })} disabled={!name || !client}
          style={{ ...S.primary, opacity: (!name || !client) ? 0.4 : 1 }}>{t.save}</button>
        <button onClick={onCancel} style={S.ghost}>{t.cancel}</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Meetings View
// ─────────────────────────────────────────────────────────
function MeetingsView({ meetings, t, meetingNo, onOpen, onDelete }) {
  if (!meetings.length) return <Empty msg={t.noMeetings} />
  return (
    <div style={{ display: 'grid', gap: 10 }} dir={t.dir}>
      {meetings.map(m => (
        <div key={m.id} onClick={() => onOpen(m)}
          style={{ ...S.card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 15 }}>
              {t.meetingNo} #{meetingNo(m.id)} — {fmtDate(m.date)}
            </div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{m.mType} · {m.location}</div>
            {m.mom && <span style={{ fontSize: 11, background: TEAL_LT, color: TEAL_MID, padding: '2px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>{t.momReady}</span>}
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete(m.id) }} style={S.danger}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Meeting Editor
// ─────────────────────────────────────────────────────────
function MeetingEditor({ mtg: m, t, globalLang, onChange, onGenerate, generating, genError, hasMom, onViewMom }) {
  const u   = (f, v) => onChange({ ...m, [f]: v })
  const addA = () => onChange({ ...m, attendees: [...(m.attendees || []), { id: uid(), name: '', company: '', role: '' }] })
  const updA = (id, f, v) => onChange({ ...m, attendees: m.attendees.map(a => a.id === id ? { ...a, [f]: v } : a) })
  const delA = id => onChange({ ...m, attendees: m.attendees.filter(a => a.id !== id) })
  const addAct = () => onChange({ ...m, actions: [...(m.actions || []), { id: uid(), text: '', owner: '', due: '' }] })
  const updAct = (id, f, v) => onChange({ ...m, actions: m.actions.map(a => a.id === id ? { ...a, [f]: v } : a) })
  const delAct = id => onChange({ ...m, actions: m.actions.filter(a => a.id !== id) })

  return (
    <div dir={t.dir}>
      {/* Lang switcher */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: '#666' }}>{t.langLabel}:</span>
        {['en', 'ar'].map(l => (
          <button key={l} onClick={() => onChange({ ...m, lang: l })}
            style={{ fontSize: 12, padding: '3px 12px', border: `1px solid ${TEAL}`, borderRadius: 5, cursor: 'pointer', background: (m.lang || globalLang) === l ? TEAL : 'none', color: (m.lang || globalLang) === l ? '#fff' : TEAL }}>
            {l === 'en' ? 'English' : 'عربي'}
          </button>
        ))}
      </div>

      {/* 01 Details */}
      <div style={S.sec}>01 — Meeting Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label={t.date}>    <input type="date" value={m.date || ''}     onChange={e => u('date', e.target.value)}     style={S.input} /></Field>
        <Field label={t.time}>    <input type="time" value={m.time || ''}     onChange={e => u('time', e.target.value)}     style={S.input} /></Field>
        <Field label={t.location}><input value={m.location || ''}             onChange={e => u('location', e.target.value)} style={S.input} /></Field>
        <Field label={t.mType}>
          <select value={m.mType || t.mTypes[0]} onChange={e => u('mType', e.target.value)} style={S.input}>
            {t.mTypes.map(x => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label={t.chaired}> <input value={m.chaired || ''}   onChange={e => u('chaired', e.target.value)}  style={S.input} /></Field>
        <Field label={t.minsBy}>  <input value={m.minsBy || ''}    onChange={e => u('minsBy', e.target.value)}   style={S.input} /></Field>
        <Field label={t.nextMtg}> <input type="date" value={m.nextMtg || ''} onChange={e => u('nextMtg', e.target.value)} style={S.input} /></Field>
      </div>

      {/* 02 Attendees */}
      <div style={S.sec}>02 — {t.attendees}</div>
      {(m.attendees || []).map(a => (
        <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input value={a.name}    onChange={e => updA(a.id, 'name', e.target.value)}    style={{ ...S.input, fontSize: 13 }} placeholder={t.name} />
          <input value={a.company} onChange={e => updA(a.id, 'company', e.target.value)} style={{ ...S.input, fontSize: 13 }} placeholder={t.company} />
          <input value={a.role}    onChange={e => updA(a.id, 'role', e.target.value)}    style={{ ...S.input, fontSize: 13 }} placeholder={t.role} />
          <button onClick={() => delA(a.id)} style={S.danger}>✕</button>
        </div>
      ))}
      <button onClick={addA} style={S.dashed}>{t.addAttendee}</button>

      {/* 03 Objectives */}
      <div style={S.sec}>03 — {t.objectives}</div>
      <textarea value={m.objectives || ''} onChange={e => u('objectives', e.target.value)}
        style={{ ...S.input, height: 60, resize: 'vertical' }} placeholder={t.objPh} />

      {/* Quick Notes */}
      <div style={{ ...S.sec, color: '#b03000', borderBottomColor: '#ffddd0', marginTop: 24 }}>{t.notes}</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{t.notesHint}</div>
      <textarea value={m.notes || ''} onChange={e => u('notes', e.target.value)}
        style={{ ...S.input, height: 160, resize: 'vertical', fontSize: 15, lineHeight: 1.8, borderColor: TEAL, borderWidth: 1.5 }}
        placeholder={t.notesPh} />

      {/* 06 Actions */}
      <div style={S.sec}>06 — {t.actions}</div>
      {(m.actions || []).map((a, i) => (
        <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '20px 3fr 2fr 1.5fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#aaa', textAlign: 'center' }}>{i + 1}</span>
          <input value={a.text}  onChange={e => updAct(a.id, 'text', e.target.value)}  style={{ ...S.input, fontSize: 13 }} placeholder={t.action} />
          <input value={a.owner} onChange={e => updAct(a.id, 'owner', e.target.value)} style={{ ...S.input, fontSize: 13 }} placeholder={t.owner} />
          <input type="date" value={a.due} onChange={e => updAct(a.id, 'due', e.target.value)} style={{ ...S.input, fontSize: 13 }} />
          <button onClick={() => delAct(a.id)} style={S.danger}>✕</button>
        </div>
      ))}
      <button onClick={addAct} style={S.dashed}>{t.addAction}</button>

      {/* AOB */}
      <div style={S.sec}>07 — {t.aob}</div>
      <textarea value={m.aob || ''} onChange={e => u('aob', e.target.value)}
        style={{ ...S.input, height: 60, resize: 'vertical' }} placeholder={t.aobPh} />

      {/* Generate */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e8ecee' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onGenerate} disabled={generating || !m.notes?.trim()}
            style={{ ...S.primary, flex: 1, fontSize: 15, padding: '12px 0', opacity: (generating || !m.notes?.trim()) ? 0.4 : 1 }}>
            {generating ? t.generating : t.generate}
          </button>
          {hasMom && <button onClick={onViewMom} style={{ ...S.ghost, padding: '12px 18px' }}>{t.viewMOM}</button>}
        </div>
        {genError && (
          <div style={{ background: '#fff3f0', border: '1px solid #ffb3a0', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#b03000', marginTop: 10 }}>
            {genError}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MOM View (preview + print source)
// ─────────────────────────────────────────────────────────
function MOMView({ mom, mtg, proj, lang, t, meetingNo, onBack, onWord, onPDF }) {
  const isAr   = lang === 'ar'
  const momRef = `MOM-${(proj.name || '').slice(0, 3).toUpperCase()}-${String(meetingNo).padStart(3, '0')}`
  const th = { background: '#2E7E8A', color: '#fff', padding: '6px 9px', fontSize: 12, textAlign: isAr ? 'right' : 'left', fontFamily: 'Arial,sans-serif' }
  const td = { padding: '5px 9px', border: '.5px solid #ddd', fontSize: 12, verticalAlign: 'top', fontFamily: 'Arial,sans-serif' }
  const lb = { ...td, background: '#e8f5f6', fontWeight: 'bold' }

  function Sec({ no, title }) {
    return <div style={{ fontWeight: 'bold', fontSize: 13, color: '#2E7E8A', borderBottom: '1px solid #d0eaec', paddingBottom: 4, marginBottom: 8, marginTop: 18, textTransform: 'uppercase', letterSpacing: '.05em' }}>{no} — {title}</div>
  }

  return (
    <div dir={t.dir}>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={onBack}  style={S.ghost}>{t.editBack}</button>
        <button onClick={onWord}  style={{ ...S.primary, background: TEAL_MID }}>{t.dlWord}</button>
        <button onClick={onPDF}   style={S.primary}>{t.dlPDF}</button>
      </div>

      {/* MOM body — used for both preview and PDF print */}
      <div id="mom-print-body" style={{ background: '#fff', borderRadius: 10, padding: '1.5rem', border: '1px solid #e0e6e8', fontFamily: 'Arial,sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2.5px solid #2E7E8A', paddingBottom: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 20, color: '#2E7E8A' }}>IWAN ARCHITECTS</div>
            <div style={{ fontSize: 11, color: '#666' }}>{isAr ? 'محضر اجتماع' : 'Minutes of Meeting'}</div>
          </div>
          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: 13 }}>{momRef}</div>
            <div style={{ fontSize: 11, color: '#666' }}>{fmtDate(mtg.date)}</div>
          </div>
        </div>

        <Sec no="01" title={isAr ? 'تفاصيل الاجتماع' : 'Meeting Details'} />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <tr><td style={lb}>{isAr ? 'اسم المشروع' : 'Project Name'}</td><td style={td}>{proj.name}</td><td style={lb}>{isAr ? 'العميل' : 'Client'}</td><td style={td}>{proj.client}</td></tr>
            <tr><td style={lb}>{isAr ? 'التاريخ' : 'Date'}</td><td style={td}>{fmtDate(mtg.date)}</td><td style={lb}>{isAr ? 'الوقت' : 'Time'}</td><td style={td}>{mtg.time}</td></tr>
            <tr><td style={lb}>{isAr ? 'الموقع' : 'Location'}</td><td style={td}>{mtg.location}</td><td style={lb}>{isAr ? 'النوع' : 'Meeting Type'}</td><td style={td}>{mtg.mType}</td></tr>
            <tr><td style={lb}>{isAr ? 'يرأسه' : 'Chaired By'}</td><td style={td}>{mtg.chaired}</td><td style={lb}>{isAr ? 'المحضر' : 'Minutes By'}</td><td style={td}>{mtg.minsBy}</td></tr>
          </tbody>
        </table>

        <Sec no="02" title={isAr ? 'الحضور' : 'Attendees'} />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead><tr><th style={th}>{isAr ? 'الاسم' : 'Name'}</th><th style={th}>{isAr ? 'الشركة' : 'Company / Dept'}</th><th style={th}>{isAr ? 'الدور' : 'Role'}</th></tr></thead>
          <tbody>{(mtg.attendees || []).map((a, i) => <tr key={i}><td style={td}>{a.name}</td><td style={td}>{a.company}</td><td style={td}>{a.role}</td></tr>)}</tbody>
        </table>

        <Sec no="03" title={isAr ? 'الأهداف' : 'Objectives'} />
        <div style={{ padding: '8px 12px', background: '#e8f5f6', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
          {(mom.objectives || []).map((o, i) => <div key={i} style={{ marginBottom: 3 }}>• {o}</div>)}
        </div>

        <Sec no="04" title={isAr ? 'الملخص التنفيذي' : 'Executive Summary'} />
        <div style={{ fontSize: 13, lineHeight: 1.75, padding: '8px 12px', background: '#f9f9f9', borderLeft: '3px solid #2E7E8A', marginBottom: 8 }}>{mom.summary}</div>

        <Sec no="05" title={isAr ? 'المناقشة والقرارات' : 'Discussion & Decisions'} />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead><tr>
            <th style={{ ...th, width: '5%' }}>#</th>
            <th style={{ ...th, width: '22%' }}>{isAr ? 'الموضوع' : 'Topic'}</th>
            <th style={{ ...th, width: '48%' }}>{isAr ? 'النقاط / القرارات' : 'Key Points / Decisions'}</th>
            <th style={{ ...th, width: '25%' }}>{isAr ? 'ملاحظات' : 'Remarks'}</th>
          </tr></thead>
          <tbody>{(mom.discussion || []).map((d, i) => <tr key={i}><td style={{ ...td, textAlign: 'center' }}>{i + 1}</td><td style={td}>{d.topic}</td><td style={td}>{d.keyPoints}</td><td style={td}>{d.remarks}</td></tr>)}</tbody>
        </table>

        <Sec no="06" title={isAr ? 'بنود العمل' : 'Action Items'} />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead><tr>
            <th style={{ ...th, width: '5%' }}>#</th>
            <th style={{ ...th, width: '40%' }}>{isAr ? 'المهمة' : 'Action Item'}</th>
            <th style={{ ...th, width: '20%' }}>{isAr ? 'المسؤول' : 'Owner'}</th>
            <th style={{ ...th, width: '15%' }}>{isAr ? 'الاستحقاق' : 'Due'}</th>
            <th style={{ ...th, width: '20%' }}>{isAr ? 'الحالة' : 'Status'}</th>
          </tr></thead>
          <tbody>{(mom.actions || []).map((a, i) => <tr key={i}><td style={{ ...td, textAlign: 'center' }}>{a.no || i + 1}</td><td style={td}>{a.description}</td><td style={td}>{a.owner}</td><td style={td}>{a.due}</td><td style={{ ...td, color: '#2E7E8A', fontWeight: 'bold' }}>{a.status}</td></tr>)}</tbody>
        </table>

        {mom.aob && <>
          <Sec no="07" title={isAr ? 'متفرقات' : 'Any Other Business'} />
          <div style={{ fontSize: 13, padding: '8px 12px', background: '#f9f9f9', borderRadius: 6, marginBottom: 8 }}>{mom.aob}</div>
        </>}

        <Sec no="08" title={isAr ? 'الاجتماع القادم' : 'Next Meeting'} />
        <div style={{ fontSize: 13, padding: '8px 12px', background: '#e8f5f6', borderRadius: 6, marginBottom: 18 }}>{mom.nextMeeting}</div>

        <div style={{ borderTop: '.5px solid #ddd', paddingTop: 8, fontSize: 11, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
          <span>IWAN Architects — {t.confidential}</span>
          <span>{fmtDate(mtg.date)}</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  )
}

function Empty({ msg }) {
  return <div style={{ color: '#aaa', textAlign: 'center', padding: '4rem 0', fontSize: 14 }}>{msg}</div>
}

// ─────────────────────────────────────────────────────────
// API Key Modal
// ─────────────────────────────────────────────────────────
function ApiKeyModal({ current, onSave, onClose }) {
  const [val, setVal] = useState(current)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: 420, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 'bold', fontSize: 15, color: TEAL, marginBottom: 6 }}>Anthropic API Key</div>
        <div style={{ fontSize: 12, color: '#777', marginBottom: 14, lineHeight: 1.6 }}>
          Required to generate meeting minutes with AI. Your key is saved in this browser only — never sent to any server except Anthropic.{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
            style={{ color: TEAL }}>Get a key →</a>
        </div>
        <input
          type="password"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="sk-ant-..."
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: `1.5px solid ${TEAL}`, borderRadius: 7, fontSize: 14, marginBottom: 14, outline: 'none' }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ background: 'none', border: '1px solid #ccd4d6', borderRadius: 7, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={() => onSave(val.trim())} disabled={!val.trim()}
            style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', opacity: val.trim() ? 1 : 0.4 }}>
            Save Key
          </button>
        </div>
      </div>
    </div>
  )
}
