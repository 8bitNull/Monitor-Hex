import { useState } from 'react'
export function Flag({ code }: { code: string }) {
  const [failed, setFailed] = useState(false)
  const valid = /^[A-Z]{2}$/.test(code)
  return valid && !failed ? <img className="flag-icon" src={`/assets/flags/${code}.svg`} alt={code} loading="lazy" onError={() => setFailed(true)} /> : <span>{code || '—'}</span>
}
const systems = ['debian', 'ubuntu', 'fedora', 'centos', 'arch', 'windows', 'rocky', 'alma', 'freebsd', 'openwrt', 'nix', 'redhat', 'gentoo', 'macos']
export function OsIcon({ os }: { os: string }) {
  const [failed, setFailed] = useState(false)
  const key = systems.find(key => os.toLowerCase().includes(key))
  return failed || (!key && !os.toLowerCase().includes('linux')) ? null : <img className="os-icon" src={key ? `/assets/logo/os-${key}.svg` : '/assets/logo/linux.svg'} alt="" loading="lazy" onError={() => setFailed(true)} />
}
