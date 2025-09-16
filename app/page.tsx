import dynamic from 'next/dynamic'
const SpirlViewer = dynamic(() => import('../components/SpirlViewer'), { ssr: false })
export default function Page(){ return <SpirlViewer/> }
