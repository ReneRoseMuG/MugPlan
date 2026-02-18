import { useEffect, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListLayout } from "@/components/ui/list-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type DbRoleCode = "READER" | "DISPATCHER" | "ADMIN";

type UserRow = {
  id: number;
  version: number;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roleCode: DbRoleCode | null;
  roleName: string | null;
};

type NewUserForm = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: DbRoleCode;
  password: string;
};

const ROLE_OPTIONS: Array<{ value: DbRoleCode; label: string }> = [
  { value: "ADMIN", label: "ADMIN" },
  { value: "DISPATCHER", label: "DISPATCHER" },
  { value: "READER", label: "READER" },
];

const EMPTY_NEW_USER_FORM: NewUserForm = {
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  roleCode: "READER",
  password: "",
};

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

function toRoleSelections(users: UserRow[]) {
  const nextSelectedRoles: Record<number, DbRoleCode> = {};
  for (const user of users) {
    nextSelectedRoles[user.id] = user.roleCode ?? "READER";
  }
  return nextSelectedRoles;
}

export function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<number, DbRoleCode>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(EMPTY_NEW_USER_FORM);
  const [isCreating, setIsCreating] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const users = await fetchUsers();
      setRows(users);
      setSelectedRoles(toRoleSelections(users));
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

  const handleCreateUser = async () => {
    const payload = {
      username: newUser.username.trim(),
      email: newUser.email.trim(),
      firstName: newUser.firstName.trim(),
      lastName: newUser.lastName.trim(),
      roleCode: newUser.roleCode,
      password: newUser.password,
    };

    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        if (body.code === "BUSINESS_CONFLICT") {
          throw new Error("Benutzername oder E-Mail existiert bereits.");
        }
        if (body.code === "VALIDATION_ERROR") {
          throw new Error("Ungueltige Eingaben. Passwort muss mindestens 10 Zeichen haben.");
        }
        throw new Error("Benutzer konnte nicht angelegt werden.");
      }

      const users = (await response.json()) as UserRow[];
      setRows(users);
      setSelectedRoles(toRoleSelections(users));
      setCreateDialogOpen(false);
      setNewUser(EMPTY_NEW_USER_FORM);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Benutzer konnte nicht angelegt werden.");
    } finally {
      setIsCreating(false);
    }
  };

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
        body: JSON.stringify({ roleCode: selectedRole, version: user.version }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
        if (payload.code === "VERSION_CONFLICT") {
          throw new Error("Die Daten wurden zwischenzeitlich geaendert. Bitte neu laden.");
        }
        throw new Error(payload.message ?? "Rollenwechsel fehlgeschlagen");
      }

      const users = (await response.json()) as UserRow[];
      setRows(users);
      setSelectedRoles(toRoleSelections(users));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Rollenwechsel fehlgeschlagen");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <>
      <ListLayout
        title="Benutzerverwaltung"
        icon={<UsersRound className="w-5 h-5" />}
        helpKey="settings"
        isLoading={isLoading}
        headerActions={
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setNewUser(EMPTY_NEW_USER_FORM);
              setCreateDialogOpen(true);
            }}
            data-testid="users-create-open"
          >
            Neuer Benutzer
          </Button>
        }
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="users-create-dialog">
          <DialogHeader>
            <DialogTitle>Neuen Benutzer anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="new-user-username">Benutzername</Label>
              <Input
                id="new-user-username"
                value={newUser.username}
                onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-user-email">E-Mail</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUser.email}
                onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="new-user-first-name">Vorname</Label>
                <Input
                  id="new-user-first-name"
                  value={newUser.firstName}
                  onChange={(event) => setNewUser((current) => ({ ...current, firstName: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-user-last-name">Nachname</Label>
                <Input
                  id="new-user-last-name"
                  value={newUser.lastName}
                  onChange={(event) => setNewUser((current) => ({ ...current, lastName: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-user-role">Rolle</Label>
              <select
                id="new-user-role"
                value={newUser.roleCode}
                onChange={(event) => setNewUser((current) => ({ ...current, roleCode: event.target.value as DbRoleCode }))}
                className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-user-password">Initialpasswort</Label>
              <Input
                id="new-user-password"
                type="password"
                value={newUser.password}
                onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
              />
              <p className="text-xs text-slate-500">Mindestens 10 Zeichen.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void handleCreateUser()} disabled={isCreating}>
              Benutzer anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
