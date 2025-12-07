import { useState } from "react";
import { Edit2, Tag, Calendar, DollarSign, Mail, Building, X, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Contact, DealStage } from "@/lib/mock-data";
import { Separator } from "@/components/ui/separator";

interface CrmPanelProps {
  contact: Contact;
  onUpdateContact: (id: number, updates: Partial<Contact>) => void;
  onClose: () => void;
}

export function CrmPanel({ contact, onUpdateContact, onClose }: CrmPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Contact>>(contact);

  // Update form data when contact changes
  if (formData.id !== contact.id && !isEditing) {
    setFormData(contact);
  }

  const handleSave = () => {
    onUpdateContact(contact.id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(contact);
    setIsEditing(false);
  };

  return (
    <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-20 transition-all duration-300">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <h2 className="font-semibold text-gray-800">Contact Info</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col items-center mb-6">
          <img src={contact.avatar} alt={contact.name} className="w-24 h-24 rounded-full object-cover mb-3 shadow-sm" />
          <h3 className="text-xl font-semibold text-gray-900 text-center">{contact.name}</h3>
          <p className="text-sm text-gray-500">{contact.phone}</p>
        </div>

        <div className="space-y-6">
            {/* Actions */}
            {!isEditing ? (
                 <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full flex gap-2">
                    <Edit2 className="w-4 h-4" /> Edit Details
                 </Button>
            ) : (
                <div className="flex gap-2">
                    <Button onClick={handleSave} className="flex-1 bg-primary hover:bg-primary/90">
                        <Save className="w-4 h-4 mr-2" /> Save
                    </Button>
                     <Button onClick={handleCancel} variant="ghost" className="flex-1">
                        Cancel
                    </Button>
                </div>
            )}

          <div className="space-y-4">
             {/* Deal Stage */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Deal Stage
              </Label>
              {isEditing ? (
                <Select 
                    value={formData.stage as string} 
                    onValueChange={(val) => setFormData({...formData, stage: val as DealStage})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Qualified">Qualified</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Closed Won">Closed Won</SelectItem>
                    <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-100 text-sm font-medium text-gray-700">
                  {contact.stage}
                </div>
              )}
            </div>
            
            <Separator />

            {/* Email */}
            <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                </Label>
                {isEditing ? (
                    <Input 
                        value={formData.email || ""} 
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="h-8"
                    />
                ) : (
                     <p className="text-sm text-gray-800 break-all">{contact.email || "—"}</p>
                )}
            </div>

            {/* Company */}
             <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Building className="w-3 h-3" /> Company
                </Label>
                 {isEditing ? (
                    <Input 
                        value={formData.company || ""} 
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        className="h-8"
                    />
                ) : (
                     <p className="text-sm text-gray-800">{contact.company || "—"}</p>
                )}
            </div>

            {/* Value */}
             <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Deal Value
                </Label>
                 {isEditing ? (
                    <Input 
                        type="number"
                        value={formData.value || ""} 
                        onChange={(e) => setFormData({...formData, value: Number(e.target.value)})}
                        className="h-8"
                    />
                ) : (
                     <p className="text-sm text-gray-800 font-medium">
                        {contact.value ? `$${contact.value.toLocaleString()}` : "—"}
                     </p>
                )}
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</Label>
                 {isEditing ? (
                    <Textarea 
                        value={formData.notes || ""} 
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        className="min-h-[100px] text-sm"
                    />
                ) : (
                    <div className="p-3 bg-yellow-50/50 border border-yellow-100 rounded-md text-sm text-gray-700 italic min-h-[60px]">
                        {contact.notes || "No notes added."}
                    </div>
                )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
                 <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Tags
                </Label>
                <div className="flex flex-wrap gap-2">
                    {contact.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                            {tag}
                        </span>
                    ))}
                    {isEditing && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-primary">+ Add</Button>
                    )}
                </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
