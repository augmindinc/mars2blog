'use client';

import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AuthErrorPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 text-center">
            <div className="w-16 h-16 bg-black/[0.02] flex items-center justify-center border border-black/5 mb-6">
                <AlertCircle className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-xl font-bold uppercase tracking-widest mb-2">Authentication Matrix Failed</h1>
            <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mb-8 max-w-xs leading-relaxed">
                The security handshake could not be established. Access tokens may be expired or the redirect signature is invalid.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <Link href="/login">
                    <Button className="w-full bg-black text-white hover:bg-black/90 rounded-none font-bold text-[10px] uppercase tracking-widest h-10 shadow-none">
                        Retry Handshake
                    </Button>
                </Link>
                <Link href="/">
                    <Button variant="outline" className="w-full rounded-none border-black/10 font-bold text-[10px] uppercase tracking-widest h-10 hover:bg-black/[0.05] shadow-none bg-transparent">
                        Return to Origin
                    </Button>
                </Link>
            </div>
        </div>
    );
}
