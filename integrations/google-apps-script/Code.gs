const DRSMILE_SHEET_ID = '18DC7Df9OCFtrbj5FmZUVcLTwC0hg_2lYnNDFjrpMSaU';
const MENUS = ['products', 'promotions', 'points', 'pharmacies', 'payments', 'faq', 'calendar'];

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty('DRSMILE_SYNC_SECRET');
    if (!expected || request.secret !== expected) return json_({ ok: false, error: 'Unauthorized' });
    if (request.action === 'push') return json_(pushAccess_(request.members || []));
    if (request.action === 'pull') return json_(pullAccess_());
    return json_({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || error) });
  }
}

function pushAccess_(members) {
  const book = SpreadsheetApp.openById(DRSMILE_SHEET_ID);
  const admin = sheet_(book, 'Admin');
  const permissions = sheet_(book, 'Permissions');
  const adminRows = [['Member ID', 'Name', 'Role', 'Email', 'Active', 'Updated At']];
  const permissionRows = [['Member ID', 'Name', 'Menu', 'View', 'Add', 'Edit', 'Delete', 'Updated At']];
  members.forEach(function(member) {
    adminRows.push([member.id, member.name, member.role || '', member.email || '', member.active ? 'TRUE' : 'FALSE', member.updatedAt || new Date().toISOString()]);
    MENUS.forEach(function(menu) {
      const value = member.permissions && member.permissions[menu] || { view: true, add: false, edit: false, delete: false };
      permissionRows.push([member.id, member.name, menu, value.view ? 'TRUE' : 'FALSE', value.add ? 'TRUE' : 'FALSE', value.edit ? 'TRUE' : 'FALSE', value.delete ? 'TRUE' : 'FALSE', member.updatedAt || new Date().toISOString()]);
    });
  });
  write_(admin, adminRows);
  write_(permissions, permissionRows);
  return { ok: true, updatedAt: new Date().toISOString() };
}

function pullAccess_() {
  const book = SpreadsheetApp.openById(DRSMILE_SHEET_ID);
  const admin = sheet_(book, 'Admin').getDataRange().getDisplayValues();
  const permissions = sheet_(book, 'Permissions').getDataRange().getDisplayValues();
  const permissionMap = {};
  permissions.slice(1).forEach(function(row) {
    const memberId = String(row[0] || '').trim();
    const menu = String(row[2] || '').trim().toLowerCase();
    if (!memberId || MENUS.indexOf(menu) === -1) return;
    permissionMap[memberId] = permissionMap[memberId] || {};
    permissionMap[memberId][menu] = { view: bool_(row[3]), add: bool_(row[4]), edit: bool_(row[5]), delete: bool_(row[6]) };
  });
  const members = admin.slice(1).filter(function(row) { return String(row[0] || row[1] || '').trim(); }).map(function(row, index) {
    const id = String(row[0] || '').trim() || ('sheet-member-' + (index + 1));
    const defaults = {};
    MENUS.forEach(function(menu) { defaults[menu] = permissionMap[id] && permissionMap[id][menu] || { view: true, add: false, edit: false, delete: false }; });
    return { id: id, name: String(row[1] || '').trim(), role: String(row[2] || '').trim(), email: String(row[3] || '').trim().toLowerCase(), active: bool_(row[4]), updatedAt: String(row[5] || ''), permissions: defaults };
  });
  return { ok: true, members: members, updatedAt: new Date().toISOString() };
}

function sheet_(book, name) {
  return book.getSheetByName(name) || book.insertSheet(name);
}

function write_(sheet, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#dceefa').setFontColor('#17365d');
  sheet.autoResizeColumns(1, rows[0].length);
}

function bool_(value) {
  return value === true || String(value || '').toLowerCase() === 'true' || String(value || '') === '1';
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
