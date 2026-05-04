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
  firstName: string;
  lastName: string;
  fullName: string;
  isActive: boolean;
  hasTwoFactorSecret: boolean;
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

type EditUserForm = {
  id: number;
  version: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: DbRoleCode;
  isActive: boolean;
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

function toEditUserForm(user: UserRow): EditUserForm {
  return {
    id: user.id,
    version: user.version,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleCode: user.roleCode ?? "READER",
    isActive: user.isActive,
    password: "",
  };
}

async function fetchUsers(): Promise<UserRow[]> {
  const response = await fetch("/api/users");
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Benutzer konnten nicht geladen werden");
  }
  return (await response.json()) as UserRow[];
}

function resolveBusinessConflictMessage(): string {
  return "Änderung nicht möglich. Prüfe auf doppelte Benutzerdaten oder Schutzregeln für den letzten aktiven Admin.";
}

export function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(EMPTY_NEW_USER_FORM);
  const [editUser, setEditUser] = useState<EditUserForm | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setTableError(null);
    try {
      const users = await fetchUsers();
      setRows(users);
    } catch (loadError) {
      setTableError(loadError instanceof Error ? loadError.message : "Benutzer konnten nicht geladen werden");
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
    setCreateError(null);
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
          throw new Error("Ungültige Eingaben. Das Initialpasswort muss mindestens 10 Zeichen haben.");
        }
        throw new Error("Benutzer konnte nicht angelegt werden.");
      }

      const users = (await response.json()) as UserRow[];
      setRows(users);
      setCreateDialogOpen(false);
      setNewUser(EMPTY_NEW_USER_FORM);
      setCreateError(null);
    } catch (createUserError) {
      setCreateError(createUserError instanceof Error ? createUserError.message : "Benutzer konnte nicht angelegt werden.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (user: UserRow) => {
    setEditUser(toEditUserForm(user));
    setEditError(null);
    setResetError(null);
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editUser) {
      return;
    }

    setSavingUserId(editUser.id);
    setEditError(null);
    setTableError(null);
    try {
      const response = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: editUser.username.trim(),
          email: editUser.email.trim(),
          firstName: editUser.firstName.trim(),
          lastName: editUser.lastName.trim(),
          roleCode: editUser.roleCode,
          isActive: editUser.isActive,
          password: editUser.password.trim() ? editUser.password : undefined,
          version: editUser.version,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { code?: string };
        if (payload.code === "VERSION_CONFLICT") {
          throw new Error("Die Benutzerdaten wurden zwischenzeitlich geändert. Bitte neu laden.");
        }
        if (payload.code === "BUSINESS_CONFLICT") {
          throw new Error(resolveBusinessConflictMessage());
        }
        if (payload.code === "VALIDATION_ERROR") {
          throw new Error("Ungültige Eingaben. Prüfe Benutzername, E-Mail, Pflichtfelder und Passwortlänge.");
        }
        throw new Error("Benutzer konnte nicht gespeichert werden.");
      }

      const users = (await response.json()) as UserRow[];
      setRows(users);
      setEditDialogOpen(false);
      setEditUser(null);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "Benutzer konnte nicht gespeichert werden.");
    } finally {
      setSavingUserId(null);
    }
  };

  const handleResetTwoFactor = async (user: UserRow) => {
    const confirmed = window.confirm(`2FA für "${user.username}" zurücksetzen? Passwort und Rollen bleiben unverändert.`);
    if (!confirmed) {
      return;
    }

    setResettingUserId(user.id);
    setResetError(null);
    setTableError(null);
    try {
      const response = await fetch(`/api/users/${user.id}/reset-2fa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version: user.version }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { code?: string };
        if (payload.code === "VERSION_CONFLICT") {
          throw new Error("Die Benutzerdaten wurden zwischenzeitlich geändert. Bitte neu laden.");
        }
        if (payload.code === "BUSINESS_CONFLICT") {
          throw new Error("2FA-Reset ist für den letzten aktiven Admin bei global aktivierter 2FA nicht erlaubt.");
        }
        throw new Error("2FA konnte nicht zurückgesetzt werden.");
      }

      const users = (await response.json()) as UserRow[];
      setRows(users);
    } catch (resetTwoFactorError) {
      setResetError(resetTwoFactorError instanceof Error ? resetTwoFactorError.message : "2FA konnte nicht zurückgesetzt werden.");
    } finally {
      setResettingUserId(null);
    }
  };

  return (
    <>
      <ListLayout
        title="Benutzerverwaltung"
        icon={<UsersRound className="w-5 h-5" />}
        helpKey="settings"
        isLoading={isLoading}
        headerActions={(
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setNewUser(EMPTY_NEW_USER_FORM);
              setCreateError(null);
              setCreateDialogOpen(true);
            }}
            data-testid="users-create-open"
          >
            Neuer Benutzer
          </Button>
        )}
        contentClassName="overflow-auto visible-vertical-scrollbar"
        contentSlot={(
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
                  <TableHead>2FA</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hasRows ? (
                  rows.map((user) => {
                    const isSaving = savingUserId === user.id;
                    const isResetting = resettingUserId === user.id;

                    return (
                      <TableRow key={user.id} data-testid={`users-row-${user.id}`}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.isActive ? "Aktiv" : "Inaktiv"}</TableCell>
                        <TableCell>{roleLabel(user.roleCode)}</TableCell>
                        <TableCell data-testid={`users-2fa-status-${user.id}`}>
                          {user.hasTwoFactorSecret ? "Eingerichtet" : "Nicht eingerichtet"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isSaving || isResetting}
                              onClick={() => handleOpenEdit(user)}
                              data-testid={`users-edit-open-${user.id}`}
                            >
                              Bearbeiten
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isSaving || isResetting}
                              onClick={() => void handleResetTwoFactor(user)}
                              data-testid={`users-reset-2fa-${user.id}`}
                            >
                              {isResetting ? "2FA-Reset..." : "2FA zurücksetzen"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-slate-500">
                      Keine Benutzer vorhanden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {tableError ? (
              <div className="border-t border-slate-200 px-4 py-3 text-sm text-destructive" data-testid="users-management-error">
                {tableError}
              </div>
            ) : null}
            {resetError ? (
              <div className="border-t border-slate-200 px-4 py-3 text-sm text-destructive" data-testid="users-reset-error">
                {resetError}
              </div>
            ) : null}
            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              Aktuelle Rollenbasis pro Benutzer: {rows.map((user) => `${user.username}:${roleLabel(user.roleCode)}`).join(" | ")}
            </div>
          </div>
        )}
      />

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setCreateError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg" data-testid="users-create-dialog">
          <DialogHeader>
            <DialogTitle>Neuen Benutzer anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {createError ? (
              <div
                className="rounded-md border border-destructive-border bg-destructive/10 px-3 py-2 text-sm text-destructive"
                data-testid="users-create-error"
              >
                {createError}
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="new-user-username">Benutzername *</Label>
              <Input
                id="new-user-username"
                required
                value={newUser.username}
                onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-user-email">E-Mail *</Label>
              <Input
                id="new-user-email"
                type="email"
                required
                value={newUser.email}
                onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="new-user-first-name">Vorname *</Label>
                <Input
                  id="new-user-first-name"
                  required
                  value={newUser.firstName}
                  onChange={(event) => setNewUser((current) => ({ ...current, firstName: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-user-last-name">Nachname *</Label>
                <Input
                  id="new-user-last-name"
                  required
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
              <Label htmlFor="new-user-password">Initialpasswort *</Label>
              <Input
                id="new-user-password"
                type="password"
                required
                minLength={10}
                value={newUser.password}
                onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
              />
              <p className="text-xs text-slate-500">Pflichtfeld, mindestens 10 Zeichen.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setCreateError(null);
              }}
              disabled={isCreating}
            >
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void handleCreateUser()} disabled={isCreating}>
              Benutzer anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditError(null);
            setEditUser(null);
          }
        }}
      >
        <DialogContent className="max-w-lg" data-testid="users-edit-dialog">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editError ? (
              <div
                className="rounded-md border border-destructive-border bg-destructive/10 px-3 py-2 text-sm text-destructive"
                data-testid="users-edit-error"
              >
                {editError}
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="edit-user-username">Benutzername *</Label>
              <Input
                id="edit-user-username"
                required
                value={editUser?.username ?? ""}
                onChange={(event) => setEditUser((current) => current ? { ...current, username: event.target.value } : current)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-user-email">E-Mail *</Label>
              <Input
                id="edit-user-email"
                type="email"
                required
                value={editUser?.email ?? ""}
                onChange={(event) => setEditUser((current) => current ? { ...current, email: event.target.value } : current)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-user-first-name">Vorname *</Label>
                <Input
                  id="edit-user-first-name"
                  required
                  value={editUser?.firstName ?? ""}
                  onChange={(event) => setEditUser((current) => current ? { ...current, firstName: event.target.value } : current)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-user-last-name">Nachname *</Label>
                <Input
                  id="edit-user-last-name"
                  required
                  value={editUser?.lastName ?? ""}
                  onChange={(event) => setEditUser((current) => current ? { ...current, lastName: event.target.value } : current)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-user-role">Rolle</Label>
                <select
                  id="edit-user-role"
                  value={editUser?.roleCode ?? "READER"}
                  onChange={(event) => setEditUser((current) => current ? { ...current, roleCode: event.target.value as DbRoleCode } : current)}
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
                <Label htmlFor="edit-user-status">Status</Label>
                <select
                  id="edit-user-status"
                  value={editUser?.isActive ? "active" : "inactive"}
                  onChange={(event) => setEditUser((current) => current ? { ...current, isActive: event.target.value === "active" } : current)}
                  className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm"
                >
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-user-password">Neues Passwort</Label>
              <Input
                id="edit-user-password"
                type="password"
                minLength={10}
                value={editUser?.password ?? ""}
                onChange={(event) => setEditUser((current) => current ? { ...current, password: event.target.value } : current)}
              />
              <p className="text-xs text-slate-500">Optional. Leer lassen, um das bestehende Passwort unverändert zu lassen. Mindestens 10 Zeichen.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditError(null);
                setEditUser(null);
              }}
              disabled={savingUserId !== null}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveUser()}
              disabled={!editUser || savingUserId !== null}
              data-testid="users-edit-save"
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
