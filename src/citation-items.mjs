// Keep the first occurrence of an identical source-and-options combination.
// A different locator, prefix, suffix or rendering option remains a separate item.
export function uniqueCitationItems(items) {
  const seen = new Set();
  return items.filter(item => {
    const keyItem = {...item, id: String(item.id)};
    if (item.locator) {
      keyItem.locator = String(item.locator);
      keyItem.label = item.label || 'page';
    } else {
      delete keyItem.locator;
      delete keyItem.label;
    }
    for (const field of ['prefix', 'suffix']) {
      if (item[field]) keyItem[field] = String(item[field]);
      else delete keyItem[field];
    }
    delete keyItem.suppressAuthor;
    if (item.suppressAuthor || item['suppress-author']) keyItem['suppress-author'] = true;
    else delete keyItem['suppress-author'];
    const key = JSON.stringify(Object.keys(keyItem).sort()
      .filter(field => keyItem[field] !== undefined)
      .map(field => [field, keyItem[field]]));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
