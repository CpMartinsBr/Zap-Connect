import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, Mail, Trash2, Crown, Shield, User, Eye } from "lucide-react";
import type { MembershipWithUser, CompanyInvitation } from "@shared/schema";

const roleConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: "Administrador", icon: <Crown className="w-3 h-3" />, color: "bg-amber-100 text-amber-800" },
  manager: { label: "Gerente", icon: <Shield className="w-3 h-3" />, color: "bg-blue-100 text-blue-800" },
  member: { label: "Membro", icon: <User className="w-3 h-3" />, color: "bg-green-100 text-green-800" },
  viewer: { label: "Visualizador", icon: <Eye className="w-3 h-3" />, color: "bg-gray-100 text-gray-800" },
};

async function fetchAPI(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }
  if (response.status === 204) return null;
  return response.json();
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const { data: members = [], isLoading: membersLoading } = useQuery<MembershipWithUser[]>({
    queryKey: ["company-members"],
    queryFn: () => fetchAPI("/api/company/members"),
  });

  const { data: invitations = [] } = useQuery<CompanyInvitation[]>({
    queryKey: ["company-invitations"],
    queryFn: () => fetchAPI("/api/company/invitations"),
  });

  const createInvitation = useMutation({
    mutationFn: (data: { email: string; role: string }) => fetchAPI("/api/company/invitations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-invitations"] });
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => fetchAPI(`/api/company/members/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: (id: number) => fetchAPI(`/api/company/members/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-members"] });
    },
  });

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      createInvitation.mutate({ email: inviteEmail, role: inviteRole });
    }
  };

  if (membersLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-gray-500">Carregando equipe...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6" /> Equipe
            </h1>
            <p className="text-gray-500">Gerencie os membros da sua empresa</p>
          </div>
          <Button 
            data-testid="btn-invite-member"
            onClick={() => setIsInviteDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Convidar Membro
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Membros ({members.length})</CardTitle>
            <CardDescription>Pessoas com acesso à sua empresa</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum membro ainda</p>
              </div>
            ) : (
              <div className="divide-y">
                {members.map((membership) => {
                  const role = roleConfig[membership.role] || roleConfig.member;
                  return (
                    <div 
                      key={membership.id}
                      data-testid={`member-row-${membership.id}`}
                      className="flex items-center justify-between py-4"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={membership.user.profileImageUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(membership.user.firstName?.[0] || membership.user.email?.[0] || "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">
                            {membership.user.firstName} {membership.user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{membership.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Select
                          value={membership.role}
                          onValueChange={(value) => updateRole.mutate({ id: membership.id, role: value })}
                        >
                          <SelectTrigger className="w-40" data-testid={`select-role-${membership.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  {config.icon} {config.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          data-testid={`btn-remove-member-${membership.id}`}
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeMember.mutate(membership.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {invitations.filter(i => i.status === "pending").length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Convites Pendentes</CardTitle>
              <CardDescription>Aguardando aceitação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {invitations.filter(i => i.status === "pending").map((invitation) => {
                  const role = roleConfig[invitation.role] || roleConfig.member;
                  return (
                    <div 
                      key={invitation.id}
                      data-testid={`invitation-row-${invitation.id}`}
                      className="flex items-center justify-between py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invitation.email}</p>
                          <p className="text-sm text-gray-500">
                            Expira em {new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge className={role.color}>
                        {role.icon} {role.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>Envie um convite por email para adicionar alguém à sua equipe</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                data-testid="input-invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {config.icon} {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              data-testid="btn-send-invite"
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || createInvitation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createInvitation.isPending ? "Enviando..." : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
