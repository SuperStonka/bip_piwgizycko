// Admin Menu Page Script
(function(){
  // Drag and Drop functionality
  let draggedElement = null;
  let draggedId = null;
  let draggedParentId = null;

  function initDragAndDrop() {
    const draggables = document.querySelectorAll('.menu-item-draggable');
    
    draggables.forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragleave', handleDragLeave);
    });
  }

  function handleDragStart(e) {
    draggedElement = this;
    draggedId = this.getAttribute('data-id');
    draggedParentId = this.getAttribute('data-parent-id');
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
  }

  function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.menu-item-draggable').forEach(item => {
      item.classList.remove('drag-over');
    });
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Only allow drop in same parent group
    const targetParentId = this.getAttribute('data-parent-id');
    if (draggedParentId === targetParentId && this !== draggedElement) {
      this.classList.add('drag-over');
    }
    return false;
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  async function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    e.preventDefault();
    
    this.classList.remove('drag-over');
    
    const targetId = this.getAttribute('data-id');
    const targetParentId = this.getAttribute('data-parent-id');
    
    // Only allow drop in same parent group
    if (draggedParentId !== targetParentId || draggedElement === this) {
      return false;
    }
    
    // Reorder in backend
    try {
      const res = await fetch('/admin/menu/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movedId: parseInt(draggedId),
          targetId: parseInt(targetId),
          parentId: draggedParentId || null
        })
      });
      const json = await res.json();
      if (json.ok) {
        showAlert('Kolejność zaktualizowana.');
        setTimeout(() => location.reload(), 800);
      } else {
        showAlert('Nie udało się zmienić kolejności.', 'error');
      }
    } catch (err) {
      showAlert('Błąd połączenia.', 'error');
    }
    
    return false;
  }

  function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `${message}<button type="button" class="close" aria-label="Zamknij" onclick="this.parentElement.remove()">×</button>`;
    const page = document.querySelector('.page-content');
    page && page.insertBefore(alert, page.firstChild);
    setTimeout(() => { alert.remove(); }, 3000);
  }

  function generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Modal references
  const addModal = document.getElementById('addMenuModal');
  const editModal = document.getElementById('editMenuModal');
  const deleteModal = document.getElementById('deleteMenuModal');
  let pendingDeleteId = null;

  // Add menu button
  document.getElementById('addMenuBtn').addEventListener('click', () => {
    addModal.classList.add('open');
  });

  // Cancel buttons
  document.getElementById('addMenuCancelBtn').addEventListener('click', () => {
    addModal.classList.remove('open');
  });
  document.getElementById('editMenuCancelBtn').addEventListener('click', () => {
    editModal.classList.remove('open');
  });
  document.getElementById('deleteMenuCancelBtn').addEventListener('click', () => {
    deleteModal.classList.remove('open');
  });

  // Slug generation for add form
  document.getElementById('menuTitle').addEventListener('input', function() {
    document.getElementById('menuSlug').value = generateSlug(this.value);
  });

  // Slug generation for edit form
  document.getElementById('editMenuTitle').addEventListener('input', function() {
    document.getElementById('editMenuSlug').value = generateSlug(this.value);
  });

  // Toggle active/visible checkboxes
  async function fetchMenuState(id) {
    try {
      const res = await fetch(`/admin/menu/${id}`);
      const json = await res.json();
      if (json && json.ok && json.item) return { is_active: json.item.is_active, hidden: json.item.hidden };
    } catch (_) {}
    return null;
  }

  document.addEventListener('change', async (e) => {
    const cb = e.target.closest('.js-toggle');
    if (!cb) return;
    
    const id = cb.dataset.id;
    const field = cb.dataset.field;
    const value = cb.checked;
    const originalValue = !value;
    
    try {
      const res = await fetch(`/admin/menu/${id}/toggle`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ field, value }) 
      });
      const json = await res.json();
      const state = json && json.ok && json.state ? json.state : await fetchMenuState(id);
      if (state) {
        const currentVisible = state.hidden == 0;
        const currentActive = state.is_active == 1;
        const wasVisibleIntent = (field === 'visible') ? value : null;
        const wasActiveIntent = (field === 'active') ? value : null;
        // Sync UI to DB
        if (field === 'visible') cb.checked = currentVisible;
        if (field === 'active') cb.checked = currentActive;
        
        // Update label colors
        const label = document.querySelector(`label[data-for="${cb.id}"]`);
        if (label) {
          if (field === 'active') {
            label.className = currentActive ? 'toggle-label label-active' : 'toggle-label label-inactive';
            label.style.margin = '0 .25rem 0 0';
          } else {
            label.className = currentVisible ? 'toggle-label label-active' : 'toggle-label label-inactive';
            label.style.margin = '0 .25rem 0 .75rem';
          }
        }
        
        const row = cb.closest('div[style*="border:1px solid"]');
        const badge = row?.querySelector('.badge');
        if (badge) {
          badge.textContent = currentVisible ? 'Widoczne' : 'Ukryte';
          badge.className = currentVisible ? 'badge badge-success' : 'badge badge-draft';
        }
        // Feedback
        if (field === 'active') {
          const ok = currentActive === wasActiveIntent;
          showAlert(ok ? `Aktywność została ${currentActive ? 'włączona' : 'wyłączona'}.` : 'Nie udało się zmienić aktywności.', ok ? 'success' : 'error');
        } else {
          const ok = currentVisible === wasVisibleIntent;
          showAlert(ok ? `Widoczność została ${currentVisible ? 'włączona' : 'wyłączona'}.` : 'Nie udało się zmienić widoczności.', ok ? 'success' : 'error');
        }
      } else {
        cb.checked = originalValue;
        showAlert('Nie udało się zaktualizować.', 'error');
      }
    } catch (err) {
      cb.checked = originalValue;
      showAlert('Błąd połączenia.', 'error');
    }
  });

  // Add menu form
  document.getElementById('addMenuForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.is_active = data.is_active ? 1 : 0;
    data.hidden = data.hidden ? 0 : 1;
    data.parent_id = data.parent_id || null;
    
    try {
      const res = await fetch('/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if ((await res.json()).ok) {
        showAlert('Pozycja dodana.');
        addModal.classList.remove('open');
        setTimeout(() => location.reload(), 1000);
      } else showAlert('Błąd dodawania.', 'error');
    } catch (err) {
      showAlert('Błąd połączenia.', 'error');
    }
  });

  // Edit menu buttons
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('js-edit-menu')) {
      const id = e.target.dataset.id;
      try {
        const res = await fetch(`/admin/menu/${id}`);
        const data = await res.json();
        if (data.ok) {
          document.getElementById('editMenuId').value = data.item.id;
          document.getElementById('editMenuTitle').value = data.item.title;
          document.getElementById('editMenuSlug').value = data.item.slug;
          document.getElementById('editMenuParent').value = data.item.parent_id || '';
          document.getElementById('editMenuDisplayMode').value = data.item.display_mode;
          document.getElementById('editMenuActive').checked = data.item.is_active == 1;
          document.getElementById('editMenuVisible').checked = data.item.hidden != 1;
          editModal.classList.add('open');
        }
      } catch (err) {
        showAlert('Błąd pobierania danych.', 'error');
      }
    }
  });

  // Edit menu form
  document.getElementById('editMenuForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const id = data.id;
    delete data.id;
    data.is_active = data.is_active ? 1 : 0;
    data.hidden = data.hidden ? 0 : 1;
    data.parent_id = data.parent_id || null;
    
    try {
      const res = await fetch(`/admin/menu/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if ((await res.json()).ok) {
        showAlert('Zaktualizowano.');
        editModal.classList.remove('open');
        setTimeout(() => location.reload(), 1000);
      } else showAlert('Błąd aktualizacji.', 'error');
    } catch (err) {
      showAlert('Błąd połączenia.', 'error');
    }
  });

  // Delete menu buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('js-delete-menu')) {
      document.getElementById('deleteMenuTitle').textContent = e.target.dataset.title;
      pendingDeleteId = e.target.dataset.id;
      deleteModal.classList.add('open');
    }
  });

  // Confirm delete
  document.getElementById('deleteMenuConfirmBtn').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await fetch(`/admin/menu/${pendingDeleteId}`, { method: 'DELETE' });
      if ((await res.json()).ok) {
        showAlert('Usunięto.');
        deleteModal.classList.remove('open');
        setTimeout(() => location.reload(), 1000);
      } else showAlert('Błąd usuwania.', 'error');
    } catch (err) {
      showAlert('Błąd połączenia.', 'error');
    }
  });

  // Initialize drag and drop
  initDragAndDrop();
})();

