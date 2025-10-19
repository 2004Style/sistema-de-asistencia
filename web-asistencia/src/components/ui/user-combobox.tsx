"use client"

import * as React from "react"
import { ChevronsUpDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useUserSearch, type User } from "@/hooks/useUserSearch.hook"
import { cn } from "@/lib/utils"

interface UserComboboxProps {
    value?: number
    onValueChange?: (userId: number) => void
    placeholder?: string
    className?: string
}

export function UserCombobox({
    value,
    onValueChange,
    placeholder = "Seleccionar usuario...",
    className,
}: UserComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null)

    const { query, setQuery, results, loading, clearSearch } = useUserSearch({
        enabled: open,
    })

    // Limpiar búsqueda al cerrar
    React.useEffect(() => {
        if (!open) {
            clearSearch()
        }
    }, [open, clearSearch])

    const handleSelect = (user: User) => {
        setSelectedUser(user)
        onValueChange?.(user.id)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    {selectedUser ? (
                        <span className="truncate">
                            {selectedUser.name} <span className="text-muted-foreground">({selectedUser.email})</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Buscar usuario..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && (
                            <div className="py-6 text-center text-sm">Buscando...</div>
                        )}
                        {!loading && results.length === 0 && query.trim().length > 0 && (
                            <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                        )}
                        {!loading && results.length === 0 && query.trim().length === 0 && (
                            <CommandEmpty>Escribe para buscar usuarios...</CommandEmpty>
                        )}
                        {results.length > 0 && (
                            <CommandGroup>
                                {results.map((user) => (
                                    <CommandItem
                                        key={user.id}
                                        value={`${user.id}|${user.name}|${user.email}`}
                                        onSelect={() => handleSelect(user)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === user.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {user.email}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
