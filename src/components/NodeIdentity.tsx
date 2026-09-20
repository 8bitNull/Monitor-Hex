import {nodeState} from '@/lib/freshness'
import {tr} from '../lib/i18n'
import type {Node} from '../lib/api'
export function Status({ node }: {
    node: Node;
}) {
    const state=nodeState(node);
    return <span className={`status-pill ${state==='live' ? 'is-online' : ''}`}><i className="dot"/>{state==='stale'?tr("数据已过期"):state==='missing'?tr("等待数据"):node.online?tr("在线"):tr("离线")}</span>;
}
export function Country({ node }: {
    node: Node;
}) {
    return node.country ? <span className="country-code">{node.country}</span> : null;
}
