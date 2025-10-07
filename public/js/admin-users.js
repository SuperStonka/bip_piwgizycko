// Admin Users Page - filtering, search, pagination, CRUD

// State
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let pageSize = 10;
let sortField = 'created';
let sortDirection = 'desc';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  loadUsers();
  initEventListeners();
});

// Load users from table
function loadUsers() {
  const rows = document.querySelectorAll('#usersTable tbody tr');
  allUsers = [];
  rows.forEach(row => {
    const id = row.dataset.id;
    if (!id) return; // Skip empty state row
    
    const cells = row.querySelectorAll('td');
    allUsers.push({
      id: parseInt(id),
      username: cells[0].textContent.trim(),
      name: cells[1].textContent.trim(),
      email: cells[2].textContent.trim(),
      role: row.querySelector('[data-role]').dataset.role,
      created: parseInt(row.querySelector('[data-date]').dataset.date),
      element: row
    });
  });
  
  filteredUsers = [...allUsers];
  applyFilters();
}

// Event listeners
function initEventListeners() {
  // Search
  document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
  
  // Role filter
  document.getElementById('roleFilter').addEventListener('change', applyFilters);
  
  // Page size
  document.getElementById('pageSize').addEventListener('change', function() {
    pageSize = parseInt(this.value);
    currentPage = 1;
    renderTable();
  });
  
  // Sorting
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', function() {
      const field = this.dataset.sort;
      if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDirection = 'asc';
      }
      updateSortIndicators();
      applySort();
      renderTable();
    });
  });
  
  // Add user
  document.getElementById('addUserBtn').addEventListener('click', openAddModal);
  document.getElementById('addUserCancelBtn').addEventListener('click', closeAddModal);
  document.getElementById('addUserForm').addEventListener('submit', handleAddUser);
  
  // Generate password in add form
  document.getElementById('generatePasswordBtn').addEventListener('click', function() {
    const password = generatePassword();
    document.getElementById('addPassword').value = password;
    document.getElementById('addPassword').type = 'text';
  });
  
  // Toggle password visibility in add form
  document.getElementById('togglePasswordBtn').addEventListener('click', function() {
    const input = document.getElementById('addPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  // Edit user
  document.addEventListener('click', function(e) {
    if (e.target.closest('.js-edit-user')) {
      const btn = e.target.closest('.js-edit-user');
      const userId = parseInt(btn.dataset.id);
      openEditModal(userId);
    }
  });
  document.getElementById('editUserCancelBtn').addEventListener('click', closeEditModal);
  document.getElementById('editUserForm').addEventListener('submit', handleEditUser);
  
  // Change password
  document.addEventListener('click', function(e) {
    if (e.target.closest('.js-change-password')) {
      const btn = e.target.closest('.js-change-password');
      const userId = parseInt(btn.dataset.id);
      const username = btn.dataset.username;
      openChangePasswordModal(userId, username);
    }
  });
  document.getElementById('changePasswordCancelBtn').addEventListener('click', closeChangePasswordModal);
  document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);
  
  // Generate password in change password form
  document.getElementById('generatePasswordChangeBtn').addEventListener('click', function() {
    const password = generatePassword();
    document.getElementById('changePasswordInput').value = password;
    document.getElementById('changePasswordInput').type = 'text';
  });
  
  // Toggle password visibility in change password form
  document.getElementById('togglePasswordChangeBtn').addEventListener('click', function() {
    const input = document.getElementById('changePasswordInput');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  // Delete user
  document.addEventListener('click', function(e) {
    if (e.target.closest('.js-delete-user')) {
      const btn = e.target.closest('.js-delete-user');
      const userId = parseInt(btn.dataset.id);
      const username = btn.dataset.username;
      openDeleteModal(userId, username);
    }
  });
  document.getElementById('deleteUserCancelBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteUserConfirmBtn').addEventListener('click', handleDeleteUser);
  
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  });
}

// Apply filters
function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  const roleFilter = document.getElementById('roleFilter').value;
  
  filteredUsers = allUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username.toLowerCase().includes(searchTerm) ||
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm);
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
  
  currentPage = 1;
  applySort();
  renderTable();
}

// Apply sorting
function applySort() {
  filteredUsers.sort((a, b) => {
    let aVal, bVal;
    
    switch(sortField) {
      case 'username':
        aVal = a.username.toLowerCase();
        bVal = b.username.toLowerCase();
        break;
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'email':
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
        break;
      case 'role':
        aVal = a.role;
        bVal = b.role;
        break;
      case 'created':
        aVal = a.created;
        bVal = b.created;
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

// Update sort indicators
function updateSortIndicators() {
  const labels = {
    'username': 'Login',
    'name': 'Imię i nazwisko',
    'email': 'Email',
    'role': 'Rola',
    'created': 'Data utworzenia'
  };
  
  document.querySelectorAll('th[data-sort]').forEach(th => {
    const field = th.dataset.sort;
    const label = labels[field] || th.textContent.replace(/[↕↑↓]/g, '').trim();
    
    if (field === sortField) {
      th.textContent = label + (sortDirection === 'asc' ? ' ↑' : ' ↓');
    } else {
      th.textContent = label + ' ↕';
    }
  });
}

// Render table
function renderTable() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';
  
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageUsers = filteredUsers.slice(start, end);
  
  if (pageUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem" class="text-muted">Brak użytkowników</td></tr>';
  } else {
    pageUsers.forEach(user => {
      tbody.appendChild(user.element.cloneNode(true));
    });
  }
  
  renderPagination();
}

// Render pagination
function renderPagination() {
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const container = document.getElementById('paginationControls');
  container.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  // Previous button
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-light';
    prevBtn.textContent = '‹';
    prevBtn.onclick = () => { currentPage--; renderTable(); };
    container.appendChild(prevBtn);
  }
  
  // Page numbers
  const maxPages = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let endPage = Math.min(totalPages, startPage + maxPages - 1);
  
  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }
  
  if (startPage > 1) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-light';
    btn.textContent = '1';
    btn.onclick = () => { currentPage = 1; renderTable(); };
    container.appendChild(btn);
    
    if (startPage > 2) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.style.padding = '0.5rem';
      container.appendChild(dots);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = i === currentPage ? 'btn btn-primary' : 'btn btn-light';
    btn.textContent = i;
    const page = i;
    btn.onclick = () => { currentPage = page; renderTable(); };
    container.appendChild(btn);
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.style.padding = '0.5rem';
      container.appendChild(dots);
    }
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-light';
    btn.textContent = totalPages;
    btn.onclick = () => { currentPage = totalPages; renderTable(); };
    container.appendChild(btn);
  }
  
  // Next button
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-light';
    nextBtn.textContent = '›';
    nextBtn.onclick = () => { currentPage++; renderTable(); };
    container.appendChild(nextBtn);
  }
}

// Modal functions
function openAddModal() {
  document.getElementById('addUserForm').reset();
  document.getElementById('addUserModal').style.display = 'flex';
}

function closeAddModal() {
  document.getElementById('addUserModal').style.display = 'none';
}

async function openEditModal(userId) {
  try {
    const res = await fetch(`/admin/users/${userId}`);
    const data = await res.json();
    
    if (!data.ok) {
      showAlert('Błąd ładowania danych użytkownika', 'error');
      return;
    }
    
    const user = data.user;
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editFirstName').value = user.imie || '';
    document.getElementById('editLastName').value = user.nazwisko || '';
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editPassword').value = '';
    document.getElementById('editRole').value = user.role;
    
    document.getElementById('editUserModal').style.display = 'flex';
  } catch (e) {
    console.error('Edit modal error:', e);
    showAlert('Błąd ładowania danych użytkownika', 'error');
  }
}

function closeEditModal() {
  document.getElementById('editUserModal').style.display = 'none';
}

let changePasswordUserId = null;

function openChangePasswordModal(userId, username) {
  changePasswordUserId = userId;
  document.getElementById('changePasswordUserId').value = userId;
  document.getElementById('changePasswordUsername').textContent = username;
  document.getElementById('changePasswordInput').value = '';
  document.getElementById('changePasswordInput').type = 'password';
  document.getElementById('changePasswordModal').style.display = 'flex';
}

function closeChangePasswordModal() {
  changePasswordUserId = null;
  document.getElementById('changePasswordModal').style.display = 'none';
}

let deleteUserId = null;

function openDeleteModal(userId, username) {
  deleteUserId = userId;
  document.getElementById('deleteUsername').textContent = username;
  document.getElementById('deleteUserModal').style.display = 'flex';
}

function closeDeleteModal() {
  deleteUserId = null;
  document.getElementById('deleteUserModal').style.display = 'none';
}

function closeAllModals() {
  closeAddModal();
  closeEditModal();
  closeChangePasswordModal();
  closeDeleteModal();
}

// CRUD handlers
async function handleAddUser(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const payload = {
    username: formData.get('username'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role')
  };
  
  try {
    const res = await fetch('/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (!data.ok) {
      showAlert(data.error || 'Błąd tworzenia użytkownika', 'error');
      return;
    }
    
    showAlert('Użytkownik został dodany', 'success');
    closeAddModal();
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    console.error('Add user error:', e);
    showAlert('Błąd tworzenia użytkownika', 'error');
  }
}

async function handleEditUser(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const userId = document.getElementById('editUserId').value;
  const payload = {
    username: formData.get('username'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password') || undefined,
    role: formData.get('role')
  };
  
  try {
    const res = await fetch(`/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (!data.ok) {
      showAlert(data.error || 'Błąd aktualizacji użytkownika', 'error');
      return;
    }
    
    showAlert('Użytkownik został zaktualizowany', 'success');
    closeEditModal();
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    console.error('Edit user error:', e);
    showAlert('Błąd aktualizacji użytkownika', 'error');
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  
  if (!changePasswordUserId) return;
  
  const formData = new FormData(e.target);
  const password = formData.get('password');
  
  if (!password) {
    showAlert('Hasło jest wymagane', 'error');
    return;
  }
  
  try {
    const res = await fetch(`/admin/users/${changePasswordUserId}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    const data = await res.json();
    
    if (!data.ok) {
      showAlert(data.error || 'Błąd zmiany hasła', 'error');
      return;
    }
    
    showAlert('Hasło zostało zmienione', 'success');
    closeChangePasswordModal();
  } catch (e) {
    console.error('Change password error:', e);
    showAlert('Błąd zmiany hasła', 'error');
  }
}

async function handleDeleteUser() {
  if (!deleteUserId) return;
  
  try {
    const res = await fetch(`/admin/users/${deleteUserId}`, {
      method: 'DELETE'
    });
    
    const data = await res.json();
    
    if (!data.ok) {
      showAlert(data.error || 'Błąd usuwania użytkownika', 'error');
      return;
    }
    
    showAlert('Użytkownik został usunięty', 'success');
    closeDeleteModal();
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    console.error('Delete user error:', e);
    showAlert('Błąd usuwania użytkownika', 'error');
  }
}

// Utility functions
function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  alertDiv.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;min-width:250px;animation:slideInRight 0.3s;';
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.style.animation = 'fadeOut 0.3s';
    setTimeout(() => alertDiv.remove(), 300);
  }, 3000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function generatePassword() {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  // Ensure at least one of each type
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  password += lower[Math.floor(Math.random() * lower.length)];
  password += upper[Math.floor(Math.random() * upper.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

