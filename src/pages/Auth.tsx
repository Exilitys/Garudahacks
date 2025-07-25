import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    fullName: "",
    userType: "organizer" as "speaker" | "organizer",
  });
  const [speakerForm, setSpeakerForm] = useState({
    bio: "",
    location: "",
    occupation: "",
    company: "",
    primaryTopic: "",
    portfolioUrl: "",
    secondaryLocation: "remote" as "remote" | "on-site" | "both",
    experienceLevel: "beginner" as "beginner" | "intermediate" | "expert",
    hourlyRate: "",
  });
  const [topics, setTopics] = useState<Array<{ id: string; name: string }>>([]);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load topics for speaker form
  React.useEffect(() => {
    const loadTopics = async () => {
      const { data } = await supabase.from("topics").select("id, name");
      if (data) setTopics(data);
    };
    loadTopics();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(loginForm.email, loginForm.password);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
      navigate("/");
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupStep === 1) {
      // Validate first step
      if (!signupForm.fullName.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter your full name.",
          variant: "destructive",
        });
        return;
      }

      if (!signupForm.email.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter your email address.",
          variant: "destructive",
        });
        return;
      }

      if (signupForm.password.length < 6) {
        toast({
          title: "Validation Error",
          description: "Password must be at least 6 characters long.",
          variant: "destructive",
        });
        return;
      }

      // If speaker, go to step 2, otherwise create account
      if (signupForm.userType === "speaker") {
        setSignupStep(2);
        return;
      }
    }

    setLoading(true);

    try {
      // Create the user account
      const { error } = await signUp(
        signupForm.email,
        signupForm.password,
        signupForm.fullName
      );

      if (error) throw error;

      // For speaker accounts, we'll update the profile after email confirmation
      // The trigger will create the basic profile, and we'll store the speaker data in localStorage temporarily
      if (signupForm.userType === "speaker") {
        localStorage.setItem(
          "pendingSpeakerData",
          JSON.stringify({
            userType: signupForm.userType,
            speakerForm: speakerForm,
          })
        );
      } else {
        localStorage.setItem(
          "pendingUserData",
          JSON.stringify({
            userType: signupForm.userType,
          })
        );
      }

      toast({
        title: "Account created!",
        description: `Welcome to TemuBicara! Please check your email to confirm your account. ${
          signupForm.userType === "speaker"
            ? "Your speaker profile will be set up after confirmation."
            : ""
        }`,
      });

      // Redirect to home page after successful account creation
      navigate("/");

      // Reset forms
      setSignupStep(1);
      setSignupForm({
        email: "",
        password: "",
        fullName: "",
        userType: "organizer",
      });
      setSpeakerForm({
        bio: "",
        location: "",
        occupation: "",
        company: "",
        primaryTopic: "",
        portfolioUrl: "",
        secondaryLocation: "remote",
        experienceLevel: "beginner",
        hourlyRate: "",
      });
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleBackToStep1 = () => {
    setSignupStep(1);
  };

  const resetSignupForm = () => {
    setSignupStep(1);
    setSignupForm({
      email: "",
      password: "",
      fullName: "",
      userType: "organizer",
    });
    setSpeakerForm({
      bio: "",
      location: "",
      occupation: "",
      company: "",
      primaryTopic: "",
      portfolioUrl: "",
      secondaryLocation: "remote",
      experienceLevel: "beginner",
      hourlyRate: "",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">SpeakBridge</CardTitle>
          <CardDescription>
            Connect speakers with speaking opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="login"
            className="w-full"
            onValueChange={(value) => {
              if (value === "login") {
                resetSignupForm();
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Your password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {signupStep === 1 && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your full name"
                      value={signupForm.fullName}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          fullName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupForm.email}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-type">I want to sign up as</Label>
                    <Select
                      value={signupForm.userType}
                      onValueChange={(value: "speaker" | "organizer") =>
                        setSignupForm({ ...signupForm, userType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="organizer">
                          Event Organizer
                        </SelectItem>
                        <SelectItem value="speaker">Speaker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {signupForm.userType === "speaker"
                      ? "Continue to Speaker Profile"
                      : "Create Account"}
                    {signupForm.userType === "speaker" && (
                      <ArrowRight className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </form>
              )}

              {signupStep === 2 && signupForm.userType === "speaker" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToStep1}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Complete your speaker profile
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="occupation">Occupation</Label>
                      <Input
                        id="occupation"
                        type="text"
                        placeholder="e.g., Software Engineer"
                        value={speakerForm.occupation}
                        onChange={(e) =>
                          setSpeakerForm({
                            ...speakerForm,
                            occupation: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        type="text"
                        placeholder="e.g., Tech Corp Inc."
                        value={speakerForm.company}
                        onChange={(e) =>
                          setSpeakerForm({
                            ...speakerForm,
                            company: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself and your expertise..."
                      value={speakerForm.bio}
                      onChange={(e) =>
                        setSpeakerForm({ ...speakerForm, bio: e.target.value })
                      }
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        type="text"
                        placeholder="e.g., San Francisco, CA"
                        value={speakerForm.location}
                        onChange={(e) =>
                          setSpeakerForm({
                            ...speakerForm,
                            location: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-location">
                        Speaking Preferences
                      </Label>
                      <Select
                        value={speakerForm.secondaryLocation}
                        onValueChange={(value: "remote" | "on-site" | "both") =>
                          setSpeakerForm({
                            ...speakerForm,
                            secondaryLocation: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remote">Remote Only</SelectItem>
                          <SelectItem value="on-site">On-site Only</SelectItem>
                          <SelectItem value="both">
                            Both Remote & On-site
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience-level">Experience Level</Label>
                      <Select
                        value={speakerForm.experienceLevel}
                        onValueChange={(
                          value: "beginner" | "intermediate" | "expert"
                        ) =>
                          setSpeakerForm({
                            ...speakerForm,
                            experienceLevel: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">
                            Intermediate
                          </SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hourly-rate">Hourly Rate (IDR)</Label>
                      <Input
                        id="hourly-rate"
                        type="number"
                        placeholder="e.g., 250000"
                        value={speakerForm.hourlyRate}
                        onChange={(e) =>
                          setSpeakerForm({
                            ...speakerForm,
                            hourlyRate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-topic">Primary Topic</Label>
                      <Select
                        value={speakerForm.primaryTopic}
                        onValueChange={(value) =>
                          setSpeakerForm({
                            ...speakerForm,
                            primaryTopic: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your main expertise" />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.name}>
                              {topic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolio-url">Portfolio URL</Label>
                    <Input
                      id="portfolio-url"
                      type="url"
                      placeholder="https://portfolio.yourwebsite.com"
                      value={speakerForm.portfolioUrl}
                      onChange={(e) =>
                        setSpeakerForm({
                          ...speakerForm,
                          portfolioUrl: e.target.value,
                        })
                      }
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Speaker Account
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
