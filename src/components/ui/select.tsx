import type {ComponentProps} from 'react'
/** Native select retains keyboard and mobile platform behavior. */
export function Select(props:ComponentProps<'select'>) { return <select data-slot="select" {...props}/> }
