import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  userType: z.enum(["client","technician"]).optional(),
  isAvailable: z.boolean().optional(),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
});

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
      userType: (user?.userType as any) || undefined,
      isAvailable: user?.isAvailable || false,
      profileImageUrl: user?.profileImageUrl || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      return await apiRequest('PATCH', '/api/user/profile', data);
    },
    onSuccess: (updatedUser: any) => {
      // Update auth cache immediately so avatar/header refresh without reload
      queryClient.setQueryData(['/api/auth/user'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSkillsMutation = useMutation({
    mutationFn: async (skills: string[]) => {
      return await apiRequest('PATCH', '/api/user/profile', { skills });
    },
    onSuccess: (updatedUser: any) => {
      queryClient.setQueryData(['/api/auth/user'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Skills Updated",
        description: "Your skills have been updated successfully!",
      });
    },
  });

  const toggleSkill = (skill: string) => {
    const currentSkills = user?.skills || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    updateSkillsMutation.mutate(newSkills);
  };

  const getInitials = () => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  if (!user) {
    return <div className="p-8" data-testid="loading-profile">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-profile">Profile</h1>
        <p className="text-muted-foreground" data-testid="text-profile-description">
          Manage your account information and preferences
        </p>
      </div>

      <Card data-testid="card-profile-info">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20" data-testid="avatar-profile">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle data-testid="text-profile-name">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Complete your profile"}
              </CardTitle>
              <p className="text-sm text-muted-foreground" data-testid="text-profile-email">{user.email}</p>
              <Badge className="mt-2 capitalize" data-testid="badge-user-type">{user.userType}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-first-name">First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your first name" {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-last-name">Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your last name" {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="userType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-user-type">User Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={(v) => field.onChange(v as any)}>
                          <SelectTrigger data-testid="select-user-type">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="technician">Technician</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                { (form.watch('userType') || user?.userType) === 'technician' && (
                  <FormItem>
                    <FormLabel data-testid="label-availability">Availability</FormLabel>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="switch-availability">Available for Jobs</Label>
                      <Switch
                        id="switch-availability"
                        checked={!!form.watch('isAvailable')}
                        onCheckedChange={(checked) => form.setValue('isAvailable', checked)}
                        data-testid="switch-isAvailable"
                      />
                    </div>
                  </FormItem>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="profileImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-profile-image-url">Profile Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} data-testid="input-profile-image-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel data-testid="label-profile-image-upload">Upload Image</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = reader.result as string;
                          form.setValue('profileImageUrl', dataUrl);
                        };
                        reader.readAsDataURL(file);
                      }}
                      data-testid="input-profile-image-file"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-phone">Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your phone number" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-bio">Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself..."
                        className="min-h-24"
                        {...field}
                        data-testid="textarea-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {user.userType === 'technician' && (
        <Card data-testid="card-skills">
          <CardHeader>
            <CardTitle data-testid="heading-skills">Skills & Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-skills-description">
              Select the services you can provide
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SERVICE_TYPES.map((skill) => (
                <Button
                  key={skill}
                  variant={(user.skills || []).includes(skill) ? "default" : "outline"}
                  className={`${(user.skills || []).includes(skill) ? "bg-gradient-to-r from-blue-600 to-indigo-600" : ""}`}
                  onClick={() => toggleSkill(skill)}
                  data-testid={`button-skill-${skill.toLowerCase()}`}
                >
                  {skill}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
