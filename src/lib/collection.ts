export function readCollection(): { system: string } {
  try {
    const value = JSON.parse(sessionStorage.getItem('monitor-next-collection-v1') || '{}')
    return { system: ['Linux','Windows','BSD','macOS','other'].includes(value?.system) ? value.system : 'all' }
  } catch { return { system: 'all' } }
}
