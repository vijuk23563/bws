// ================================================================
//  BALAJI WOODEN SOLUTIONS — Firebase Config
//  Saves bookings ONLINE to Firestore + syncs to localStorage.
//  Works offline too (localStorage fallback).
// ================================================================
//
//  Deployment instructions: see DEPLOYMENT.md.
//  Never use open Firestore test-mode rules on a deployed site.
// ================================================================

const firebaseConfig = {

  apiKey: "AIzaSyCDzLsRfPABmvexFcEHvEeE_E4TttEbXVQ",

  authDomain: "balaji-shop-1cd6f.firebaseapp.com",

  projectId: "balaji-shop-1cd6f",

  storageBucket: "balaji-shop-1cd6f.firebasestorage.app",

  messagingSenderId: "758377045402",

  appId: "1:758377045402:web:6314f55149d3a2c7fdae23",

  measurementId: "G-5W8752ETGX"

};


// ---- Keys ----
const LS_B = 'bws_bookings';
const LS_D = 'bws_designs';
const FB_CONFIGURED = firebaseConfig.apiKey !== 'YOUR_API_KEY';

let db       = null;
let fbOnline = false;

// ---- Init ----
function initFirebase() {
  if (!FB_CONFIGURED) { console.warn('⚠️ Firebase not configured. Using localStorage only.'); return false; }
  try {
    if (typeof firebase === 'undefined') return false;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    fbOnline = true;
    console.log('✅ Firebase Firestore connected — bookings will save ONLINE.');
    document.dispatchEvent(new Event('firebase-ready'));
    return true;
  } catch (e) {
    console.error('Firebase init error:', e);
    return false;
  }
}

// ---- Generate local ID ----
function _genId() {
  return 'BWS-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
}

// ---- Local helpers ----
function _getLS(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
function _setLS(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

// ================================================================
//  SAVE BOOKING
//  → Saves to Firestore (online) AND localStorage (offline backup)
// ================================================================
async function saveBookingToDatabase(data) {
  const id   = _genId();
  const record = { id, ...data, status: 'pending', createdAt: Date.now(), source: 'website' };

  // Always save locally first
  const local = _getLS(LS_B);
  local.unshift(record);
  _setLS(LS_B, local);

  // Try Firestore, but do not leave the booking form waiting indefinitely.
  if (fbOnline && db) {
    let timeoutId;
    const writePromise = Promise.resolve()
      .then(() => db.collection('bookings').add({
        ...data,
        localId:   id,
        status:    'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        source:    'website'
      }))
      .then(ref => {
        const updated = _getLS(LS_B).map(b => b.id === id ? { ...b, firestoreId: ref.id } : b);
        _setLS(LS_B, updated);
        const syncStatus = document.getElementById('bookingSyncStatus');
        if (syncStatus) {
          syncStatus.textContent = 'Your booking has synced to Firebase and is visible to the admin.';
          syncStatus.style.color = '#2e7d32';
        }
        console.log('✅ Booking saved to Firestore:', ref.id);
        return { id: ref.id, synced: true, syncPending: false };
      })
      .catch(e => {
        console.warn('Firestore save failed, kept locally:', e.message);
        const syncStatus = document.getElementById('bookingSyncStatus');
        if (syncStatus) {
          syncStatus.textContent = 'Your booking is saved on this device, but Firebase is unavailable and it may not appear on other devices yet.';
          syncStatus.style.color = '#c8902a';
        }
        return { id, synced: false, syncPending: false };
      });

    const result = await Promise.race([
      writePromise,
      new Promise(resolve => {
        timeoutId = setTimeout(() => resolve({ id, synced: false, syncPending: true }), 5000);
      })
    ]);
    clearTimeout(timeoutId);
    return result;
  }
  return { id, synced: false, syncPending: false };
}

// ================================================================
//  SAVE DESIGN REQUEST
// ================================================================
async function saveDesignRequest(data) {
  const id     = _genId();
  const record = { id, ...data, status: 'new', createdAt: Date.now(), source: 'website' };

  const local = _getLS(LS_D);
  local.unshift(record);
  _setLS(LS_D, local);

  if (fbOnline && db) {
    let timeoutId;
    const writePromise = Promise.resolve()
      .then(() => db.collection('design_requests').add({
        ...data,
        localId:   id,
        status:    'new',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        source:    'website'
       }))
      .then(ref => {
        const updated = _getLS(LS_D).map(d => d.id === id ? { ...d, firestoreId: ref.id } : d);
        _setLS(LS_D, updated);
        const syncStatus = document.getElementById('designSyncStatus');
        if (syncStatus) {
          syncStatus.textContent = 'Your request has synced to Firebase and is visible to the admin.';
          syncStatus.style.color = '#2e7d32';
        }
        console.log('✅ Design request saved to Firestore:', ref.id);
        return { id: ref.id, synced: true, syncPending: false };
      })
      .catch(e => {
        console.warn('Firestore save failed, kept locally:', e.message);
        const syncStatus = document.getElementById('designSyncStatus');
        if (syncStatus) {
          syncStatus.textContent = 'Your request is saved on this device, but Firebase is unavailable and it may not appear on other devices yet.';
          syncStatus.style.color = '#c8902a';
        }
        return { id, synced: false, syncPending: false };
      });

    const result = await Promise.race([
      writePromise,
      new Promise(resolve => {
        timeoutId = setTimeout(() => resolve({ id, synced: false, syncPending: true }), 5000);
      })
    ]);
    clearTimeout(timeoutId);
    return result;
  }
  return { id, synced: false, syncPending: false };
}

// ================================================================
//  REAL-TIME LISTENER — Firestore → localStorage sync
//  Called by admin portal. Merges Firestore data into localStorage.
// ================================================================
function listenBookings(onUpdate) {
  if (!fbOnline || !db) { onUpdate(_getLS(LS_B)); return null; }
  return db.collection('bookings')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      const items = [];
      snap.forEach(doc => {
        const d = doc.data();
        items.push({
          id:        d.localId || doc.id,
          firestoreId: doc.id,
          name:      d.name     || '',
          phone:     d.phone    || '',
          email:     d.email    || '',
          service:   d.service  || '',
          date:      d.date     || '',
          time:      d.time     || '',
          address:   d.address  || '',
          notes:     d.notes    || '',
          status:    d.status   || 'pending',
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().getTime() : (d.createdAt || Date.now()),
          source:    d.source   || 'website'
        });
      });
      // Merge with any local-only records (not yet synced)
      const local = _getLS(LS_B);
      const fsIds = new Set(items.map(i => i.firestoreId));
      const localOnly = local.filter(l => !l.firestoreId || !fsIds.has(l.firestoreId));
      const merged = [...items, ...localOnly];
      merged.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
      _setLS(LS_B, merged);
      onUpdate(merged);
    }, err => {
      console.error('Firestore listen error:', err);
      onUpdate(_getLS(LS_B));
    });
}

function listenDesigns(onUpdate) {
  if (!fbOnline || !db) { onUpdate(_getLS(LS_D)); return null; }
  return db.collection('design_requests')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      const items = [];
      snap.forEach(doc => {
        const d = doc.data();
        items.push({
          id:          d.localId || doc.id,
          firestoreId: doc.id,
          name:        d.name        || '',
          phone:       d.phone       || '',
          email:       d.email       || '',
          item:        d.item        || '',
          wood:        d.wood        || '',
          budget:      d.budget      || '',
          timeline:    d.timeline    || '',
          description: d.description || '',
          notes:       d.notes       || '',
          status:      d.status      || 'new',
          createdAt:   d.createdAt?.toDate ? d.createdAt.toDate().getTime() : (d.createdAt || Date.now()),
          source:      d.source      || 'website'
        });
      });
      const local = _getLS(LS_D);
      const fsIds = new Set(items.map(i => i.firestoreId));
      const localOnly = local.filter(l => !l.firestoreId || !fsIds.has(l.firestoreId));
      const merged = [...items, ...localOnly];
      merged.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
      _setLS(LS_D, merged);
      onUpdate(merged);
    }, err => {
      console.error('Firestore listen error:', err);
      onUpdate(_getLS(LS_D));
    });
}

function listenGallery(onUpdate, onError) {
  if (!fbOnline || !db) {
    if (onError) onError(new Error('Firebase is not connected.'));
    return null;
  }
  return db.collection('gallery_items')
    .orderBy('order', 'asc')
    .onSnapshot(snapshot => {
      onUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, error => {
      console.error('Gallery listener error:', error);
      if (onError) onError(error);
    });
}

// ================================================================
//  UPDATE STATUS (Firestore + localStorage)
// ================================================================
async function updateBookingStatus(id, status) {
  // Update locally
  const B = _getLS(LS_B);
  const i = B.findIndex(b => b.id === id || b.firestoreId === id);
  if (i >= 0) { B[i].status = status; B[i].updatedAt = Date.now(); _setLS(LS_B, B); }

  // Update Firestore
  if (fbOnline && db) {
    const rec = B[i];
    const fsId = rec?.firestoreId || id;
    try {
      await db.collection('bookings').doc(fsId).update({
        status, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { console.warn('Firestore status update failed:', e.message); }
  }
}

async function updateBookingRecord(id, data) {
  const bookings = _getLS(LS_B);
  const index = bookings.findIndex(b => b.id === id || b.firestoreId === id);
  if (index < 0) return;

  bookings[index] = { ...bookings[index], ...data, updatedAt: Date.now() };
  _setLS(LS_B, bookings);

  const firestoreId = bookings[index].firestoreId;
  if (fbOnline && db && firestoreId) {
    try {
      await db.collection('bookings').doc(firestoreId).update({
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn('Firestore booking update failed:', e.message);
    }
  }
}

async function updateDesignStatus(id, status) {
  const D = _getLS(LS_D);
  const i = D.findIndex(d => d.id === id || d.firestoreId === id);
  if (i >= 0) { D[i].status = status; D[i].updatedAt = Date.now(); _setLS(LS_D, D); }

  if (fbOnline && db) {
    const rec = D[i];
    const fsId = rec?.firestoreId || id;
    try {
      await db.collection('design_requests').doc(fsId).update({
        status, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { console.warn('Firestore status update failed:', e.message); }
  }
}

// ================================================================
//  DELETE (Firestore + localStorage)
// ================================================================
async function deleteRecord(collection, id) {
  const key  = collection === 'bookings' ? LS_B : LS_D;
  const data = _getLS(key);
  const rec  = data.find(r => r.id === id || r.firestoreId === id);
  _setLS(key, data.filter(r => r.id !== id && r.firestoreId !== id));

  if (fbOnline && db && rec?.firestoreId) {
    try { await db.collection(collection).doc(rec.firestoreId).delete(); } catch(e) {}
  }
}

// ---- Compat aliases (used by old inline scripts) ----
async function fetchBookings(cb)       { return listenBookings(cb); }
async function fetchDesignRequests(cb) { return listenDesigns(cb); }

function formatTimestamp(ts) {
  if (!ts) return '—';
  const d = (ts && ts.toDate) ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ---- Status indicator in page ----
function showFBStatus() {
  const existing = document.getElementById('fb-status-bar');
  if (existing) existing.remove();
  const bar = document.createElement('div');
  bar.id = 'fb-status-bar';
  bar.style.cssText = `position:fixed;bottom:0;left:0;right:0;z-index:9998;padding:7px 16px;
    font-size:.78rem;font-weight:600;text-align:center;
    background:${fbOnline ? '#e8f5e9' : '#fff8e1'};
    color:${fbOnline ? '#2e7d32' : '#e65100'};
    border-top:2px solid ${fbOnline ? '#a5d6a7' : '#ffcc02'};`;
  bar.textContent = fbOnline
    ? '🌐 Online Mode — Bookings are saving to Firebase (visible from any device)'
    : '💾 Offline Mode — Bookings saving locally. Add Firebase config to go online.';
  document.body.appendChild(bar);
  setTimeout(() => { if (bar) bar.style.opacity = '0'; bar.style.transition = 'opacity 1s'; }, 6000);
  setTimeout(() => { if (bar) bar.remove(); }, 7000);
}

// ---- Auto-init ----
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initFirebase();
    if (document.querySelector('.booking-form-card, .design-form-card')) {
      showFBStatus();
    }
  }, 400);
});
