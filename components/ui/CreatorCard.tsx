"use client";

interface Creator {
    username: string;
    eth: string;
    avatar?: string;
}

interface CreatorCardProps {
    creator: Creator;
}

export default function CreatorCard({ creator }: CreatorCardProps) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-neon-purple/50 transition-all group">
            <div className="flex items-center gap-3">
                {creator.avatar ? (
                    <img
                        src={creator.avatar}
                        alt={creator.username}
                        className="w-10 h-10 rounded-full border-2 border-neon-purple/50"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan" />
                )}
                <span className="text-white font-semibold group-hover:text-neon-cyan transition-colors">
                    {creator.username}
                </span>
            </div>
            <span className="text-neon-cyan font-bold text-sm">{creator.eth}</span>
        </div>
    );
}
