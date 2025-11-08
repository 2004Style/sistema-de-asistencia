"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";

type BtnLinkProps = {
    data: {
        href: string;
        Icon: LucideIcon;
        name: string;
    }
}

export default function BtnLink({
    data
}: BtnLinkProps) {
    return (
        <Link href={data.href} className="flex gap-2 px-4 py-2 rounded-md bg-[#9500FF] text-white">
            <data.Icon />
            {data.name}
        </Link>
    );
}