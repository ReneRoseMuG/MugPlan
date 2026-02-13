import { useEffect, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListLayout } from "@/components/ui/list-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DbRoleCode = "READER" | "DISPATCHER" | "ADMIN";

type UserRow = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roleCode: DbRoleCode | null;
  roleName: string | null;
};

const ROLE_OPTIONS: Array<{ value: DbRoleCode; label: string }> = [
  { value: "ADMIN", label: "ADMIN" },
  { value: "DISPATCHER", label: "DISPATCHER" },
  { value: "READER", label: "READER" },
];

function roleLabel(roleCode: DbRoleCode | null) {
  return roleCode ?? "-";
}

async function fetchUsers(): Promise<UserRow[]> {
  const response = await fetch("/api/users");
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Benutzer konnten nicht geladen werden");
  }
  return (await response.json()) as UserRow[];
}

export function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<number, DbRoleCode>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const users = await fetchUsers();
      setRows(users);
      const nextSelectedRoles: Record<number, DbRoleCode> = {};
      for (const user of users) {
        nextSelectedRoles[user.id] = user.roleCode ?? "READER";
      }
      setSelectedRoles(nextSelectedRoles);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Benutzer konnten nicht geladen werden");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);

  const handleSave = async (user: UserRow) => {
    const selectedRole = selectedRoles[user.id];
    if (!selectedRole || selectedRole === user.roleCode) {
      return;
    }

    setSavingUserId(user.id);
    setError(null);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleCode: selectedRole }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? "Rollenwechsel fehlgeschlagen");
      }

      const users = (await response.json()) as UserRow[];
      setRows(users);
      const nextSelectedRoles: Record<number, DbRoleCode> = {};
      for (const entry of users) {
        nextSelectedRoles[entry.id] = entry.roleCode ?? "READER";
      }
      setSelectedRoles(nextSelectedRoles);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Rollenwechsel fehlgeschlagen");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <ListLayout
      title="Benutzerverwaltung"
      icon={<UsersRound className="w-5 h-5" />}
      helpKey="settings"
      isLoading={isLoading}
      contentSlot={
        <div className="rounded-md border border-slate-200 bg-white" data-testid="users-management-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Benutzername</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasRows ? (
                rows.map((user) => {
                  const selectedRole = selectedRoles[user.id] ?? "READER";
                  const changed = selectedRole !== user.roleCode;
                  const isSaving = savingUserId === user.id;

                  return (
                    <TableRow key={user.id} data-testid={`users-row-${user.id}`}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.isActive ? "Aktiv" : "Inaktiv"}</TableCell>
                      <TableCell>
                        <select
                          value={selectedRole}
                          onChange={(event) => {
                            const nextRole = event.target.value as DbRoleCode;
                            setSelectedRoles((current) => ({ ...current, [user.id]: nextRole }));
                          }}
                          className="h-9 min-w-36 rounded border border-slate-300 bg-white px-2 text-sm"
                          data-testid={`users-role-select-${user.id}`}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!changed || isSaving}
                          onClick={() => void handleSave(user)}
                          data-testid={`users-save-role-${user.id}`}
                        >
                          Speichern
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-slate-500">
                    Keine Benutzer vorhanden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {error ? (
            <div className="border-t border-slate-200 px-4 py-3 text-sm text-destructive" data-testid="users-management-error">
              {error}
            </div>
          ) : null}
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Aktuelle Rollenbasis pro Benutzer: {rows.map((user) => `${user.username}:${roleLabel(user.roleCode)}`).join(" | ")}
          </div>
        </div>
      }
    />
  );
}
