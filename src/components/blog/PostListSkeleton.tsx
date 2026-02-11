export function PostListSkeleton() {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex gap-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-8 w-16 bg-muted/20 animate-pulse" />
                    ))}
                </div>
                <div className="w-full md:w-80 h-10 bg-muted/20 animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-4">
                        <div className="aspect-video w-full bg-muted/20 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-4 w-1/4 bg-muted/20 animate-pulse" />
                            <div className="h-6 w-full bg-muted/20 animate-pulse" />
                            <div className="h-20 w-full bg-muted/20 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
