import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mic2,
  Calendar,
  Shield,
  Star,
  ArrowRight,
  Users,
  CheckCircle,
} from "lucide-react";

const HomePage = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: Users,
      title: "Speaker Discovery",
      description:
        "Find talented speakers by topic, experience level, and budget",
    },
    {
      icon: Calendar,
      title: "Event Management",
      description: "Post and manage speaking opportunities with ease",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description:
        "Verified profiles and secure communication for trusted connections",
    },
    {
      icon: Star,
      title: "Rating System",
      description:
        "Build reputation through reviews and ratings from past events",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Connect <span className="text-primary">Speakers</span> with{" "}
              <span className="text-primary">Opportunities</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              SpeakBridge democratizes access to speaking opportunities by
              connecting aspiring speakers with event organizers seeking fresh
              voices for their events.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to="/events">
                  <Button size="lg" className="w-full sm:w-auto">
                    Browse Events
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link to="/speakers">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  View Speakers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose SpeakBridge?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform makes it simple, transparent, and fair for both
              speakers and organizers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* For Speakers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Mic2 className="mr-3 h-6 w-6 text-primary" />
                  For Speakers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Create Your Profile</h4>
                    <p className="text-muted-foreground">
                      Showcase your expertise and speaking topics
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Browse Opportunities</h4>
                    <p className="text-muted-foreground">
                      Find events that match your interests and schedule
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Apply & Connect</h4>
                    <p className="text-muted-foreground">
                      Submit proposals and connect with organizers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* For Organizers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Calendar className="mr-3 h-6 w-6 text-primary" />
                  For Organizers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Post Your Event</h4>
                    <p className="text-muted-foreground">
                      Share event details and requirements
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Review Applications</h4>
                    <p className="text-muted-foreground">
                      Browse speaker profiles and proposals
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Book & Manage</h4>
                    <p className="text-muted-foreground">
                      Select speakers and manage your event
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of speakers and organizers already using SpeakBridge
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Link to="/events">
                  <Button size="lg" className="w-full sm:w-auto">
                    Browse Events
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Complete Your Profile
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto">
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
