document.addEventListener('DOMContentLoaded', () => {
  const table = document.getElementById('articlesTable');
  // --- Article form helpers (slug generation) ---
  (function(){
    const title = document.querySelector('input[name="title"]');
    const slug = document.querySelector('input[name="slug"]');
    const regen = document.getElementById('regenSlugBtn');
    if (title && slug) {
      let manualSlug = false;
      const toSlug = (t) => (t||'')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-z0-9\s-]/g,'')
        .trim().replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,50);
      slug.addEventListener('input', ()=>{ manualSlug = true; if (slug.value.length>50) slug.value = slug.value.slice(0,50); });
      title.addEventListener('input', ()=>{ if (!manualSlug) slug.value = toSlug(title.value); });
      regen && regen.addEventListener('click', ()=>{ slug.value = toSlug(title.value); manualSlug = false; });
    }
    // Init Quill editor if present
  const editorEl = document.getElementById('editor');
  const hidden = document.getElementById('contentInput');
  if (editorEl && hidden && window.Quill) {
    // Initialize after next tick to avoid race with defer scripts
    setTimeout(()=>{
      const toolbarOptions = [
        ['bold','italic','underline','strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link','image'],
        ['clean']
      ];
      const quill = new Quill(editorEl, { theme: 'snow', placeholder: 'Wprowadź treść artykułu...', modules: { toolbar: toolbarOptions } });
      // expose for previews
      window.__adminQuill = quill;
      if (hidden.value) quill.clipboard.dangerouslyPasteHTML(hidden.value);
      const syncHidden = ()=>{ hidden.value = quill.root.innerHTML; };
      quill.on('text-change', syncHidden);

      // Custom handlers for image/file upload and HTML view
      const toolbar = quill.getModule('toolbar');
      toolbar.addHandler('image', async () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = async () => {
          const file = input.files[0]; if(!file) return;
          const form = new FormData(); form.append('image', file);
          const res = await fetch('/admin/uploads/image', { method:'POST', body: form });
          const json = await res.json();
          if (json.ok) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', json.url, 'user');
          } else { alert('Błąd uploadu obrazka'); }
        };
        input.click();
      });

      // Extra button for file upload
      const fileBtn = document.createElement('button');
      fileBtn.type='button'; fileBtn.title='Dodaj plik'; fileBtn.textContent='📄';
      fileBtn.className = 'ql-file';
      const toolbarEl = editorEl.parentElement.querySelector('.ql-toolbar');
      if (toolbarEl) {
        const imageBtn = toolbarEl.querySelector('button.ql-image');
        if (imageBtn && imageBtn.parentElement) {
          imageBtn.parentElement.insertBefore(fileBtn, imageBtn.nextSibling);
        } else {
          toolbarEl.appendChild(fileBtn);
        }
      }
      let pendingFileUrl = null; let pendingFileName = ''; let pendingInsertIndex = null;
      fileBtn.addEventListener('click', async ()=>{
        const input = document.createElement('input'); input.type='file';
        input.onchange = async () => {
          const file = input.files[0]; if(!file) return;
          const form = new FormData(); form.append('file', file);
          const res = await fetch('/admin/uploads/file', { method:'POST', body: form });
          const json = await res.json();
          if (json.ok) {
            pendingFileUrl = json.url; pendingFileName = json.name || 'plik';
            const sel = quill.getSelection(true) || { index: quill.getLength() };
            pendingInsertIndex = sel.index;
            // open modal to edit display name in Polish
            if (fileModal) {
              fileNameInput.value = pendingFileName;
              fileModal.classList.add('open');
            }
          } else { alert('Błąd uploadu pliku'); }
        };
        input.click();
      });

      // HTML toggle button
      const htmlBtn = document.createElement('button');
      htmlBtn.type='button'; htmlBtn.title='Kod HTML'; htmlBtn.textContent='</>'; htmlBtn.style.marginLeft='6px'; htmlBtn.style.width='35px';
      toolbarEl && toolbarEl.appendChild(htmlBtn);
      let htmlMode = false;
      htmlBtn.addEventListener('click', ()=>{
        htmlMode = !htmlMode;
        if (htmlMode) {
          hidden.style.display='block'; editorEl.style.display='none';
          hidden.value = quill.root.innerHTML;
        } else {
          editorEl.style.display='block'; hidden.style.display='none';
          quill.clipboard.dangerouslyPasteHTML(hidden.value);
        }
        syncHidden();
      });

      // Editing existing elements via double click
      const fileModal = document.getElementById('fileEditModal');
      const fileNameInput = document.getElementById('fileDisplayName');
      const fileCancel = document.getElementById('fileEditCancel');
      const fileConfirm = document.getElementById('fileEditConfirm');

      const imageModal = document.getElementById('imageEditModal');
      const imgAlt = document.getElementById('imgAlt');
      const imgWidth = document.getElementById('imgWidth');
      const imgCancel = document.getElementById('imageEditCancel');
      const imgConfirm = document.getElementById('imageEditConfirm');

      let targetEl = null;
      editorEl.addEventListener('dblclick', (e)=>{
        const t = e.target;
        if (t && t.tagName === 'A') {
          e.preventDefault(); targetEl = t;
          fileNameInput.value = t.textContent || '';
          fileModal.classList.add('open');
        }
        if (t && t.tagName === 'IMG') {
          e.preventDefault(); targetEl = t;
          imgAlt.value = t.getAttribute('alt') || '';
          imgWidth.value = t.style.width ? parseInt(t.style.width,10) : t.naturalWidth;
          imageModal.classList.add('open');
        }
      });
      fileCancel?.addEventListener('click', ()=>{ fileModal.classList.remove('open'); targetEl=null; });
      fileConfirm?.addEventListener('click', ()=>{
        if (targetEl && targetEl.tagName==='A') {
          // Editing existing link
          targetEl.textContent = fileNameInput.value || targetEl.textContent;
          syncHidden();
        } else if (pendingFileUrl) {
          // Inserting a new uploaded file link with chosen display name
          const name = fileNameInput.value || pendingFileName;
          const idx = (typeof pendingInsertIndex==='number') ? pendingInsertIndex : quill.getSelection(true)?.index || quill.getLength();
          quill.insertText(idx, name, 'user');
          quill.formatText(idx, name.length, 'link', pendingFileUrl);
          syncHidden();
        }
        fileModal.classList.remove('open'); targetEl=null; pendingFileUrl=null; pendingInsertIndex=null; pendingFileName='';
      });
      imgCancel?.addEventListener('click', ()=>{ imageModal.classList.remove('open'); targetEl=null; });
      imgConfirm?.addEventListener('click', ()=>{
        if (targetEl && targetEl.tagName==='IMG') {
          targetEl.setAttribute('alt', imgAlt.value || '');
          if (imgWidth.value && !isNaN(parseInt(imgWidth.value,10))) targetEl.style.width = parseInt(imgWidth.value,10)+'px';
          syncHidden();
        }
        imageModal.classList.remove('open'); targetEl=null;
      });
    }, 0);
  }
  })();

  // Versions preview/restore handlers should be active on edit form pages too
  document.addEventListener('click', (e) => {
    const previewBtn = e.target.closest('.js-preview-version');
    if (previewBtn) {
      e.preventDefault();
      const articleId = document.getElementById('articleId')?.value || document.getElementById('articleForm')?.action.match(/\/admin\/articles\/(\d+)/)?.[1];
      const vid = previewBtn.dataset.versionId;
      if (!articleId || !vid) return;
      (async ()=>{
        try {
          const res = await fetch(`/admin/articles/${articleId}/versions/${vid}`);
          const json = await res.json();
          if (!json.ok) return;
          const modal = document.getElementById('versionPreviewModal');
          const meta = document.getElementById('versionPreviewMeta');
          const diffTitle = document.getElementById('diffTitle');
          const diffExcerpt = document.getElementById('diffExcerpt');
          const diffContent = document.getElementById('diffContent');
          const curTitle = document.querySelector('input[name="title"]')?.value || '';
          const curExcerpt = document.querySelector('textarea[name="excerpt"]')?.value || '';
          const curContent = document.getElementById('contentInput')?.value || '';
          const isChanged = (a,b) => (String(a||'').trim() !== String(b||'').trim());
          if (modal && meta && diffTitle && diffExcerpt && diffContent) {
            meta.textContent = new Date(json.version.created_at).toLocaleString('pl-PL');
            diffTitle.textContent = json.version.title || '';
            diffExcerpt.textContent = json.version.excerpt || '';
            diffContent.innerHTML = json.version.content || '';
            diffTitle.classList.toggle('changed', isChanged(curTitle, json.version.title));
            diffExcerpt.classList.toggle('changed', isChanged(curExcerpt, json.version.excerpt));
            diffContent.classList.toggle('changed', isChanged(curContent, json.version.content));
            modal.classList.add('open');
            // attach selected version id to confirm button
            const confirmBtn = document.getElementById('versionRestoreConfirm');
            confirmBtn.dataset.versionId = vid;
          }
        } catch (_) {}
      })();
      return;
    }

    const restoreBtn = e.target.closest('.js-restore-version');
    if (restoreBtn) {
      e.preventDefault();
      // Open preview modal if not opened; user confirms to load into form
      const modal = document.getElementById('versionPreviewModal');
      const isOpen = modal?.classList.contains('open');
      const vid = restoreBtn.dataset.versionId;
      if (!isOpen) {
        previewBtn?.click();
        // set target id for confirm button once modal opens
        const confirmBtn = document.getElementById('versionRestoreConfirm');
        if (confirmBtn) confirmBtn.dataset.versionId = vid;
        return;
      }
      const confirmBtn = document.getElementById('versionRestoreConfirm');
      if (confirmBtn) { confirmBtn.dataset.versionId = vid; confirmBtn.click(); }
    }
  });

  if (!table) return; // Only on Articles list page (rest of logic below)

  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  const pageSizeSelect = document.getElementById('pageSize');
  const paginationControls = document.getElementById('paginationControls');

  let currentSort = { key: 'created', asc: false };
  let currentPage = 1;

  function getSortValue(tr, key) {
    const idxMap = { title: 0, status: 1, author: 2, category: 3, created: 4, views: 5 };
    const cell = tr.children[idxMap[key]];
    if (!cell) return '';
    if (key === 'created') return parseInt(cell.dataset.date || '0', 10);
    if (key === 'views') return parseInt(cell.dataset.views || '0', 10);
    if (key === 'status') return (cell.dataset.status || '').toLowerCase();
    return (cell.innerText || '').toLowerCase();
  }

  function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  function sortBy(key) {
    const tbody = table.tBodies[0];
    if (!tbody) return;
    const rows = Array.from(tbody.rows);
    const asc = currentSort.key === key ? !currentSort.asc : true;
    rows.sort((r1, r2) => compare(getSortValue(r1, key), getSortValue(r2, key)) * (asc ? 1 : -1));
    rows.forEach(r => tbody.appendChild(r));
    currentSort = { key, asc };
    // Update header arrows
    const heads = table.tHead?.querySelectorAll('th[data-sort]') || [];
    heads.forEach(h => h.classList.remove('sorted-asc','sorted-desc'));
    const active = table.tHead?.querySelector(`th[data-sort="${key}"]`);
    if (active) active.classList.add(asc ? 'sorted-asc' : 'sorted-desc');
    filterRows();
  }

  function getAllRows() { return Array.from(table.tBodies[0].rows); }

  function applyVisibility(rows) {
    const size = parseInt(pageSizeSelect?.value || '10', 10);
    const start = (currentPage - 1) * size;
    const end = start + size;
    let visibleIndex = 0;
    rows.forEach(r => {
      if (r.__match === false) { r.style.display = 'none'; return; }
      const show = visibleIndex >= start && visibleIndex < end;
      r.style.display = show ? '' : 'none';
      if (r.__match !== false) visibleIndex++;
    });
  }

  function renderPagination(totalVisible) {
    if (!paginationControls) return;
    const size = parseInt(pageSizeSelect?.value || '10', 10);
    const pages = Math.max(1, Math.ceil(totalVisible / size));
    if (currentPage > pages) currentPage = pages;
    paginationControls.innerHTML = '';
    const makeBtn = (label, page, disabled = false, active = false) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.className = 'btn btn-light';
      if (disabled) b.disabled = true; if (active) b.style.background = '#e5e7eb';
      b.addEventListener('click', () => { currentPage = page; filterRows(); });
      return b;
    };
    paginationControls.appendChild(makeBtn('«', Math.max(1, currentPage - 1), currentPage === 1));
    const windowSize = 5; let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    let end = Math.min(pages, start + windowSize - 1); start = Math.max(1, end - windowSize + 1);
    for (let p = start; p <= end; p++) paginationControls.appendChild(makeBtn(String(p), p, false, p === currentPage));
    paginationControls.appendChild(makeBtn('»', Math.min(pages, currentPage + 1), currentPage === pages));
  }

  function filterRows() {
    const q = (searchInput?.value || '').toLowerCase();
    const st = statusFilter?.value || '';
    const cat = (categoryFilter?.value || '').toLowerCase();
    const rows = getAllRows();
    let visibleCount = 0;
    rows.forEach(r => {
      const matchesSearch = r.innerText.toLowerCase().includes(q);
      const matchesStatus = !st || (r.children[1].dataset.status === st);
      const matchesCat = !cat || (r.children[3].innerText.toLowerCase() === cat);
      r.__match = matchesSearch && matchesStatus && matchesCat;
      if (r.__match) visibleCount++;
    });
    renderPagination(visibleCount);
    applyVisibility(rows);
  }

  // Bind events
  table.tHead?.querySelectorAll('th[data-sort]')?.forEach(th => {
    th.addEventListener('click', () => sortBy(th.dataset.sort));
  });
  // Initialize arrow on default sort
  const defaultHead = table.tHead?.querySelector('th[data-sort="created"]');
  if (defaultHead) defaultHead.classList.add('sorted-desc');
  [searchInput, statusFilter, categoryFilter, pageSizeSelect].forEach(el => el && el.addEventListener('input', () => { currentPage = 1; filterRows(); }));

  // Initial render
  filterRows();

  // Dismiss alerts (X)
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.alert .close');
    if (!btn) return;
    e.preventDefault();
    const alertEl = btn.closest('.alert');
    alertEl && alertEl.remove();
  });

  // Delete modal logic (works with CSP, no inline scripts)
  const deleteModal = document.getElementById('deleteModal');
  const deleteTitleEl = document.getElementById('deleteArticleTitle');
  const deleteCancelBtn = document.getElementById('deleteCancelBtn');
  const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
  let deletePendingId = null;

  document.addEventListener('click', (e) => {
    // Preview version (article edit form)
    const previewBtn = e.target.closest('.js-preview-version');
    if (previewBtn) {
      e.preventDefault();
      const articleId = document.getElementById('articleId')?.value || document.getElementById('articleForm')?.action.match(/\/admin\/articles\/(\d+)/)?.[1];
      const vid = previewBtn.dataset.versionId;
      if (!articleId || !vid) return;
      (async ()=>{
        try {
          const res = await fetch(`/admin/articles/${articleId}/versions/${vid}`);
          const json = await res.json();
          if (!json.ok) return;
          const modal = document.getElementById('versionPreviewModal');
          const meta = document.getElementById('versionPreviewMeta');
          const t = document.getElementById('versionPreviewTitleText');
          const c = document.getElementById('versionPreviewContent');
          if (modal && meta && t && c) {
            meta.textContent = new Date(json.version.created_at).toLocaleString('pl-PL');
            t.textContent = json.version.title || '';
            c.innerHTML = json.version.content || '';
            modal.classList.add('open');
          }
        } catch (_) {}
      })();
      return;
    }

    // Restore version (article edit form)
    const restoreBtn = e.target.closest('.js-restore-version');
    if (restoreBtn) {
      e.preventDefault();
      if (!confirm('Przywrócić wybraną wersję?')) return;
      const articleId = document.getElementById('articleId')?.value || document.getElementById('articleForm')?.action.match(/\/admin\/articles\/(\d+)/)?.[1];
      const vid = restoreBtn.dataset.versionId;
      if (!articleId || !vid) return;
      (async ()=>{
        try {
          const res = await fetch(`/admin/articles/${articleId}/versions/${vid}/restore`, { method: 'POST' });
          const json = await res.json();
          if (json.ok) location.href = `/admin/articles/${articleId}/edit?restored=1`;
          else alert('Błąd przywracania wersji');
        } catch (_) { alert('Błąd przywracania wersji'); }
      })();
      return;
    }
    const del = e.target.closest('.js-delete');
    if (!del) return;
    e.preventDefault();
    const tr = del.closest('tr');
    deletePendingId = del.dataset.id || tr?.dataset.id || null;
    if (deleteTitleEl && tr) deleteTitleEl.textContent = tr.children[0]?.innerText || '';
    deleteModal?.classList.add('open');
  });

  deleteCancelBtn?.addEventListener('click', () => deleteModal?.classList.remove('open'));
  deleteConfirmBtn?.addEventListener('click', async () => {
    if (!deletePendingId) return;
    try {
      const res = await fetch(`/admin/articles/${deletePendingId}/delete`, { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        const row = table.querySelector(`tr[data-id="${deletePendingId}"]`);
        row?.parentElement?.removeChild(row);
        filterRows();
      } else {
        alert('Nie udało się usunąć artykułu');
      }
    } catch (_) {
      alert('Błąd usuwania artykułu');
    }
    deleteModal?.classList.remove('open');
  });
});

// Close preview modal (global)
document.addEventListener('DOMContentLoaded', ()=>{
  const modal = document.getElementById('versionPreviewModal');
  const closeBtn = document.getElementById('versionPreviewClose');
  closeBtn && closeBtn.addEventListener('click', ()=> modal?.classList.remove('open'));
  modal && modal.addEventListener('click', (e)=>{ if (e.target === modal) modal.classList.remove('open'); });
  const confirmBtn = document.getElementById('versionRestoreConfirm');
  confirmBtn && confirmBtn.addEventListener('click', async ()=>{
    const vid = confirmBtn.dataset.versionId;
    if (!vid) return;
    // fetch version and load into form without saving to DB
    const articleId = document.getElementById('articleId')?.value || document.getElementById('articleForm')?.action.match(/\/admin\/articles\/(\d+)/)?.[1];
    try {
      const res = await fetch(`/admin/articles/${articleId}/versions/${vid}`);
      const json = await res.json();
      if (!json.ok) return;
      const v = json.version;
      // Fill form fields
      const titleEl = document.querySelector('input[name="title"]');
      const excerptEl = document.querySelector('textarea[name="excerpt"]');
      const hidden = document.getElementById('contentInput');
      titleEl && (titleEl.value = v.title || '');
      excerptEl && (excerptEl.value = v.excerpt || '');
      hidden && (hidden.value = v.content || '');
      if (window.__adminQuill) window.__adminQuill.clipboard.dangerouslyPasteHTML(v.content || '');
      modal.classList.remove('open');
      // show info alert to save
      const alert = document.createElement('div');
      alert.className = 'alert alert-success';
      alert.innerHTML = 'Załadowano wersję do formularza. Zapisz, aby utrwalić zmiany.<button type="button" class="close" aria-label="Zamknij">×</button>';
      const page = document.querySelector('.page-content');
      page && page.insertBefore(alert, page.firstChild);
      setTimeout(()=>{ alert.remove(); }, 5000);
    } catch (_) {}
  });
});


