import {Component,type ReactNode} from 'react'
import {tr} from '../lib/i18n'
export class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<section className="render-error" role="alert"><h1>{tr('页面显示异常')}</h1><p>{tr('请刷新页面重试，或返回首页。')}</p><button onClick={()=>location.reload()}>{tr('刷新')}</button><a href="/">{tr('返回首页')}</a></section>:this.props.children}
}
