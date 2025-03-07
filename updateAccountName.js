const { updateAccountName } = require('./Canvas_API');

(async function run() {
  try {
    const accountId = 1;
    const newName = 'NewNameUpdated';

    const updatedAccount = await updateAccountName(accountId, newName);
    console.log('Updated account:', updatedAccount);
  } catch (err) {
    console.error('Failed to update account:', err.message);
  }
})();
