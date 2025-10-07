// Admin Settings Page Script
(function(){
  function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `${message}<button type="button" class="close" aria-label="Zamknij" onclick="this.parentElement.remove()">×</button>`;
    const page = document.querySelector('.page-content');
    page && page.insertBefore(alert, page.firstChild);
    setTimeout(() => { alert.remove(); }, 3000);
  }

  const form = document.getElementById('settingsForm');
  if (!form) {
    console.error('Settings form not found');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('=== SETTINGS FORM SUBMIT ===');
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    console.log('Form data:', data);
    
    try {
      console.log('Sending POST to /admin/settings');
      const res = await fetch('/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      console.log('Response status:', res.status);
      const json = await res.json();
      console.log('Response JSON:', json);
      
      if (json.ok) {
        showAlert('Ustawienia zostały zapisane.');
      } else {
        showAlert('Nie udało się zapisać ustawień.', 'error');
      }
    } catch (err) {
      console.error('Settings save error:', err);
      showAlert('Błąd połączenia z serwerem.', 'error');
    }
  });
})();

