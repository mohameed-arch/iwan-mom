import { db } from './firebase.js'
import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, onSnapshot
} from 'firebase/firestore'

// ── Projects ──────────────────────────────────────────────
export async function getProjects() {
  const snap = await getDocs(collection(db, 'projects'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function createProject(data) {
  const ref = await addDoc(collection(db, 'projects'), {
    ...data,
    createdAt: new Date().toISOString()
  })
  return ref.id
}

export async function deleteProject(id) {
  await deleteDoc(doc(db, 'projects', id))
}

// ── Meetings ──────────────────────────────────────────────
export async function getMeetings(projectId) {
  const q = query(
    collection(db, 'meetings'),
    where('projectId', '==', projectId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.date > a.date ? 1 : -1)
}

export async function createMeeting(data) {
  const ref = await addDoc(collection(db, 'meetings'), {
    ...data,
    createdAt: new Date().toISOString()
  })
  return ref.id
}

export async function updateMeeting(id, data) {
  await updateDoc(doc(db, 'meetings', id), data)
}

export async function deleteMeeting(id) {
  await deleteDoc(doc(db, 'meetings', id))
}
