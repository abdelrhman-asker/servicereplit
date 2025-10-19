import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const SERVICE_TYPES = [
  "Plumber",
  "Electrician",
  "Carpenter",
  "Painter",
  "HVAC",
  "Locksmith",
  "Cleaner",
  "Handyman",
];

const formSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().min(6, "Phone is required"),
  serviceType: z.string().min(1, "Service type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(5, "Location is required"),
  images: z.array(z.string()).default([]),
});

export default function CreateRequestDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void; }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: user?.firstName || user?.lastName ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : "",
      phone: user?.phone || "",
      serviceType: "",
      description: "",
      location: "",
      images: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Update profile name/phone first for convenience
      const [firstName, ...rest] = data.fullName.split(" ");
      const lastName = rest.join(" ").trim() || undefined;
      try {
        await apiRequest('PATCH', '/api/user/profile', { firstName: firstName || undefined, lastName, phone: data.phone });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      } catch {}
      // Create request including images
      const payload = {
        serviceType: data.serviceType,
        description: data.description,
        location: data.location,
        images: data.images,
      } as any;
      return await apiRequest('POST', '/api/service-requests', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
      toast({ title: 'Request Created', description: 'Your service request has been posted.' });
      onSuccess();
      onClose();
      form.reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Service Request</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d)=>mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., +1 555 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SERVICE_TYPES.map((t)=> (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problem Images</FormLabel>
                  <div className="border rounded-md p-4 text-center cursor-pointer" onClick={() => {
                    const input = document.getElementById('dialog-file-input') as HTMLInputElement | null;
                    input?.click();
                  }}>
                    <div className="text-sm text-muted-foreground">Click to upload images</div>
                    <input id="dialog-file-input" type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      const toDataUrl = (file: File) => new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                      });
                      const dataUrls = await Promise.all(files.map(toDataUrl));
                      field.onChange([...(field.value || []), ...dataUrls]);
                    }} />
                  </div>
                  {Array.isArray(field.value) && field.value.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {field.value.map((src: string, idx: number) => (
                        <div key={idx} className="relative group">
                          <img src={src} alt={`upload-${idx}`} className="w-full h-24 object-cover rounded" />
                          <button type="button" className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100" onClick={() => {
                            const next = [...field.value];
                            next.splice(idx,1);
                            field.onChange(next);
                          }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="Address or use current" {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const { latitude, longitude } = pos.coords;
                          form.setValue('location', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                        });
                      }
                    }}>Use current</Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-28" placeholder="Describe the service you need..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating...' : 'Create Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
