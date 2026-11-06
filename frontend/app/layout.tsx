import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'MediFed AI | Federated Research Workspace',description:'Privacy-aware multimodal research and real federated learning on synthetic data.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
