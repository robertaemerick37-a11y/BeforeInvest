async function loadUsers() {
  const role = localStorage.getItem('userRole');
  const statusMsg = document.getElementById('status-msg');
  const table = document.getElementById('users-table');
  const tbody = document.getElementById('users-body');

  localStorage.removeItem('token');
  table.hidden = true;
  tbody.replaceChildren();
  statusMsg.hidden = false;
  statusMsg.textContent = 'Checking admin session...';
  if (role !== 'admin') {
    statusMsg.textContent = 'Unauthorized access. Admin privileges required.';
    window.location.replace('login.html');
    return;
  }

  try {
    const response = await fetch('/api/admin/users');
    const data = await response.json();

    if (!response.ok) {
      statusMsg.textContent = data.error || 'Failed to load user data.';
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('userRole');
        window.location.replace('login.html');
      }
      return;
    }

    statusMsg.hidden = true;
    table.hidden = false;
    tbody.replaceChildren();

    data.users.forEach((user) => {
      const row = document.createElement('tr');
      [user.id, user.email].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });

      const roleCell = document.createElement('td');
      const roleBadge = document.createElement('span');
      roleBadge.className = `role-badge${user.role === 'admin' ? ' role-badge--admin' : ''}`;
      roleBadge.textContent = user.role;
      roleCell.appendChild(roleBadge);
      row.appendChild(roleCell);

      const accountCell = document.createElement('td');
      const editor = document.createElement('div');
      editor.className = 'account-editor';

      function makeField(labelText, input, wide = false) {
        const wrap = document.createElement('label');
        wrap.className = `account-field${wide ? ' account-field--wide' : ''}`;
        const span = document.createElement('span');
        span.textContent = labelText;
        wrap.append(span, input);
        return wrap;
      }

      const balanceInput = document.createElement('input');
      balanceInput.type = 'number';
      balanceInput.min = '0';
      balanceInput.step = '0.01';
      balanceInput.value = Number(user.balance || 0).toFixed(2);

      const depositedInput = document.createElement('input');
      depositedInput.type = 'number';
      depositedInput.min = '0';
      depositedInput.step = '0.01';
      depositedInput.value = Number(user.deposited || 0).toFixed(2);

      const earnedInput = document.createElement('input');
      earnedInput.type = 'number';
      earnedInput.min = '0';
      earnedInput.step = '0.01';
      earnedInput.value = Number(user.earnedToday || 0).toFixed(2);

      const tasksInput = document.createElement('input');
      tasksInput.type = 'number';
      tasksInput.min = '0';
      tasksInput.step = '1';
      tasksInput.max = '60';
      tasksInput.value = String(Math.round(Number(user.tasksCompleted || 0)));

      const tierSelect = document.createElement('select');
      ['Standard', 'Silver', 'Gold'].forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        tierSelect.appendChild(option);
      });
      tierSelect.value = user.tier || 'Standard';

      const reasonInput = document.createElement('input');
      reasonInput.type = 'text';
      reasonInput.maxLength = 200;
      reasonInput.placeholder = 'Optional, shown to the user, e.g. Transfer confirmed';

      const hashInput = document.createElement('input');
      hashInput.type = 'text';
      hashInput.maxLength = 120;
      hashInput.placeholder = 'Transaction hash (optional)';

      const saveSection = document.createElement('section');
      saveSection.className = 'account-field-group';
      saveSection.setAttribute('aria-label', 'Save section values');
      const saveSectionTitle = document.createElement('h3');
      saveSectionTitle.textContent = 'Profile Save section';
      const saveSectionDescription = document.createElement('p');
      saveSectionDescription.textContent = 'Set the daily earning and completed task count shown to this user.';
      const saveSectionFields = document.createElement('div');
      saveSectionFields.className = 'account-field-group-fields';
      saveSectionFields.append(
        makeField('Earned today (USD)', earnedInput),
        makeField('Tasks completed (out of 60)', tasksInput)
      );
      saveSection.append(saveSectionTitle, saveSectionDescription, saveSectionFields);

      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.className = 'btn-save-balance';
      saveButton.textContent = 'Save';
      saveButton.addEventListener('click', () =>
        saveAccount(user.id, { balanceInput, depositedInput, earnedInput, tasksInput, tierSelect, reasonInput, hashInput }, saveButton)
      );

      editor.append(
        makeField('Wallet balance (USD)', balanceInput),
        makeField('Deposited (USD)', depositedInput),
        makeField('Tier', tierSelect),
        saveSection,
        makeField('Reason (optional)', reasonInput, true),
        makeField('Tx hash (optional)', hashInput, true),
        saveButton
      );
      accountCell.appendChild(editor);
      row.appendChild(accountCell);

      const createdCell = document.createElement('td');
      createdCell.textContent = new Date(user.created_at).toLocaleString();
      row.appendChild(createdCell);

      const actionsCell = document.createElement('td');
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn-delete';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => deleteUser(user.id));
      actionsCell.appendChild(deleteButton);
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });
    await loadPendingPurchases();
  } catch (error) {
    statusMsg.textContent = 'Server connection error.';
  }
}

async function loadPendingPurchases() {
  const status = document.getElementById('pending-purchases-status');
  const table = document.getElementById('pending-purchases-table');
  const tbody = document.getElementById('pending-purchases-body');
  status.hidden = false;
  status.textContent = 'Loading pending purchases...';
  table.hidden = true;
  tbody.replaceChildren();

  try {
    const response = await fetch('/api/admin/transactions/pending', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load pending purchases.');

    const rows = (data.transactions || []).map((transaction) => {
      const row = document.createElement('tr');
      const purchaseName = `${transaction.assetName} (${transaction.assetSymbol}) × ${transaction.quantity}`;
      const amount = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: transaction.currency,
      }).format(Number(transaction.total));

      [transaction.email, purchaseName, amount].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.appendChild(cell);
      });

      const creditCell = document.createElement('td');
      const creditInput = document.createElement('input');
      creditInput.type = 'number';
      creditInput.min = '0.01';
      creditInput.step = '0.01';
      creditInput.className = 'purchase-credit-input';
      creditInput.setAttribute('aria-label', `USD amount to credit for ${purchaseName}`);
      if (transaction.currency === 'USD') {
        creditInput.value = Number(transaction.total).toFixed(2);
      } else {
        creditInput.placeholder = 'Enter USD equivalent';
      }
      creditCell.appendChild(creditInput);
      row.appendChild(creditCell);

      const submittedCell = document.createElement('td');
      submittedCell.textContent = new Date(transaction.createdAt).toLocaleString();
      row.appendChild(submittedCell);

      const confirmationCell = document.createElement('td');
      confirmationCell.className = 'purchase-confirmation';
      const confirmLabel = document.createElement('label');
      confirmLabel.className = 'purchase-confirmation-check';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      const labelText = document.createElement('span');
      labelText.textContent = 'I verified the transfer was received and matches this amount';
      confirmLabel.append(checkbox, labelText);

      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'btn-confirm-purchase';
      confirmButton.textContent = 'Confirm & credit';
      confirmButton.disabled = true;
      const updateConfirmButton = () => {
        confirmButton.disabled = !checkbox.checked || !Number.isFinite(Number(creditInput.value)) ||
          Number(creditInput.value) <= 0;
      };
      checkbox.addEventListener('change', updateConfirmButton);
      creditInput.addEventListener('input', updateConfirmButton);
      confirmButton.addEventListener('click', () =>
        confirmPurchase(transaction.id, checkbox, creditInput, confirmButton)
      );
      confirmationCell.append(confirmLabel, confirmButton);
      row.appendChild(confirmationCell);
      return row;
    });

    tbody.replaceChildren(...rows);
    table.hidden = rows.length === 0;
    status.textContent = rows.length ? '' : 'No pending purchases.';
    status.hidden = rows.length > 0;
  } catch (error) {
    status.hidden = false;
    status.textContent = error.message || 'Could not load pending purchases.';
  }
}

async function confirmPurchase(id, checkbox, creditInput, button) {
  const creditAmountUSD = Number(creditInput.value);
  if (!checkbox.checked || !Number.isFinite(creditAmountUSD) || creditAmountUSD <= 0) return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/admin/transactions/${id}/confirm`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmTransaction: true, creditAmountUSD }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not confirm this purchase.');

    alert(data.message);
    await loadUsers();
  } catch (error) {
    alert(error.message || 'Could not confirm this purchase.');
    button.disabled = !checkbox.checked || !Number.isFinite(Number(creditInput.value)) ||
      Number(creditInput.value) <= 0;
  }
}

async function saveAccount(id, fields, button) {
  const balance = Number(fields.balanceInput.value);
  const deposited = Number(fields.depositedInput.value);
  const earnedToday = Number(fields.earnedInput.value);
  const tasksCompleted = Number(fields.tasksInput.value);
  const reason = fields.reasonInput.value.trim();

  if (!Number.isFinite(balance) || balance < 0 || !Number.isFinite(deposited) || deposited < 0 ||
      !Number.isFinite(earnedToday) || earnedToday < 0 ||
      !Number.isInteger(tasksCompleted) || tasksCompleted < 0 || tasksCompleted > 60) {
    alert('Enter valid non-negative amounts (tasks: a whole number from 0 to 60).');
    return;
  }
  button.disabled = true;
  try {
    const response = await fetch(`/api/admin/users/${id}/account`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        balance,
        deposited,
        earnedToday,
        tasksCompleted,
        tier: fields.tierSelect.value,
        // Reason is optional; fall back to a neutral note so the server's
        // history entry still has something to show the user.
        reason: reason || 'Account updated',
        txHash: fields.hashInput.value.trim(),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'Failed to update account.');
      return;
    }
    fields.balanceInput.value = Number(data.balance).toFixed(2);
    fields.depositedInput.value = Number(data.deposited).toFixed(2);
    fields.tierSelect.value = data.tier;
    if (data.earnedToday !== undefined) fields.earnedInput.value = Number(data.earnedToday).toFixed(2);
    if (data.tasksCompleted !== undefined) fields.tasksInput.value = String(Math.round(Number(data.tasksCompleted)));
    fields.reasonInput.value = '';
    fields.hashInput.value = '';
    alert(data.message);
  } catch (error) {
    alert('Failed to update account.');
  } finally {
    button.disabled = false;
  }
}

async function deleteUser(id) {
  if (!confirm(`Are you sure you want to delete user ID ${id}?`)) return;

  try {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (response.ok) {
      alert(data.message);
      loadUsers();
    } else {
      alert(data.error || 'Failed to delete user.');
    }
  } catch (error) {
    alert('Failed to delete user.');
  }
}

document.getElementById('admin-signout')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const response = await fetch('/api/logout', { method: 'POST', cache: 'no-store' });
    if (!response.ok) throw new Error('Server did not confirm sign out.');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
    document.getElementById('users-table').hidden = true;
    document.getElementById('users-body').replaceChildren();
    window.location.replace('login.html?loggedOut=1');
  } catch (error) {
    button.disabled = false;
    alert('Could not sign out securely. Check your connection and try again.');
  }
});

document.addEventListener('DOMContentLoaded', loadUsers);
document.getElementById('refresh-pending-purchases')?.addEventListener('click', loadPendingPurchases);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) loadUsers();
});
window.addEventListener('pagehide', () => {
  document.getElementById('users-table').hidden = true;
  document.getElementById('users-body').replaceChildren();
  document.getElementById('pending-purchases-table').hidden = true;
  document.getElementById('pending-purchases-body').replaceChildren();
});