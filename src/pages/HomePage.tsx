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
  DollarSign,
  Brain,
  CreditCard,
  TrendingUp,
  MessageSquare,
  UserCheck,
  Search,
  Zap,
  Clock,
  Globe,
  Phone,
} from "lucide-react";

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-8xl font-bold tracking-tight mb-6">
              Bridge the gap. <br />
              <span className="text-primary">Speak the change</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4 max-w-4xl mx-auto">
              "The process of matching the right speaker to an event is
              time-consuming and lacks transparency."
            </p>
            <p className="text-2xl font-semibold mb-8 max-w-4xl mx-auto">
              "TemuBicara connects event organizers with trusted speakers
              through a transparent and easy-to-use platform."
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

      {/* About TemuBicara Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              What is TemuBicara?
            </h2>
            <div className="prose prose-lg mx-auto text-left">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Temu Bicara is a digital platform designed to connect event
                organizers with speakers, particularly those who are emerging or
                underrepresented in the speaking circuit. It not only simplifies
                the process of discovering, booking, and communicating with
                speakers, but also acts as a trusted third party for payments,
                ensuring secure and transparent transactions.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Whether it's for seminars, conferences, lectures, or
                workshops—Temu Bicara empowers new voices, helps organizers find
                relevant speakers efficiently, and fosters a more inclusive
                knowledge-sharing ecosystem.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              🎯 Key Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive tools and features designed to make
              speaker-organizer connections seamless, secure, and successful
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Speaker & Organizer Matching */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-primary text-white">
                <CardTitle className="flex items-center text-lg">
                  <Brain className="mr-2 h-5 w-5" />
                  👥 Speaker & Organizer Matching
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Search className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        AI-Based Matching
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Smart tag-based matching by topic, budget, location
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Star className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Portfolio Showcase
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Ratings, reviews, and portfolio displays
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <TrendingUp className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Experience Filtering
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Filter by expertise level and experience
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Secure Booking & Payment */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-green-600 text-white">
                <CardTitle className="flex items-center text-lg">
                  <CreditCard className="mr-2 h-5 w-5" />
                  💼 Secure Booking & Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">Escrow System</h4>
                      <p className="text-muted-foreground text-xs">
                        Secure transactions with auto disbursement
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Digital Contracts
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Digital agreements with transparency
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <DollarSign className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Multiple Payment Methods
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        E-wallets, bank transfer, QRIS support
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Speaker Growth Tools */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  📈 Speaker Growth Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Users className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Comprehensive Profiles
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Bio, topics, videos, portfolio showcase
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Analytics Dashboard
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Track engagement, bookings, ratings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">Feedback System</h4>
                      <p className="text-muted-foreground text-xs">
                        Continuous improvement feedback
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Management */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="mr-2 h-5 w-5" />
                  📅 Event Management
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Calendar className="h-4 w-4 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">Event Creation</h4>
                      <p className="text-muted-foreground text-xs">
                        Create and manage event details easily
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Users className="h-4 w-4 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Invitation Management
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Manage invitations and shortlists
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-purple-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Auto Documentation
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Auto-generated agreements and invoices
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Communication & Scheduling */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-orange-600 text-white">
                <CardTitle className="flex items-center text-lg">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  📩 Communication & Scheduling
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Built-in Communication
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Integrated chat and video calls
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Clock className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Smart Notifications
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Reminders for meetings and deadlines
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Phone className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Video Integration
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Seamless video call integration
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trust & Safety */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-red-600 text-white">
                <CardTitle className="flex items-center text-lg">
                  <UserCheck className="mr-2 h-5 w-5" />
                  🛡️ Trust & Safety
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <UserCheck className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        ID/KTP Verification
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Complete verification for both parties
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Star className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">RLS Scoring</h4>
                      <p className="text-muted-foreground text-xs">
                        Review-Led Scoring for trust
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        Transparent Reviews
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Open review system for quality
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">TARGET</h2>
            <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Mic2 className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">Experts</h3>
                <p className="text-muted-foreground">
                  Experts that has started or want to start their public
                  speaking career to be recognized or discovered easier
                </p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Calendar className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">Event Organizers</h3>
                <p className="text-muted-foreground">
                  Event organizers that are in need for experts for public
                  speaking or workshops
                </p>
              </div>
            </div>
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
                      Build a detailed profile with your expertise, experience,
                      and portfolio
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Set Your Rates</h4>
                    <p className="text-muted-foreground">
                      Display your transparent pricing so organizers can plan
                      confidently
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Get Discovered</h4>
                    <p className="text-muted-foreground">
                      Let our smart matching system connect you with relevant
                      opportunities
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
                    <h4 className="font-semibold">Browse Speaker Directory</h4>
                    <p className="text-muted-foreground">
                      Search through organized profiles with detailed
                      information and reviews
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">See Transparent Pricing</h4>
                    <p className="text-muted-foreground">
                      View upfront rates and plan your budget clearly and
                      confidently
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Smart Filtering</h4>
                    <p className="text-muted-foreground">
                      Use advanced search to find the perfect speaker for your
                      event
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
            Ready to Bridge the Gap?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join the transparent platform that connects experts with
            opportunities. Whether you're looking to speak or seeking speakers,
            TemuBicara makes it simple.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Link to="/events">
                  <Button size="lg" className="w-full sm:w-auto">
                    Find Speaking Opportunities
                  </Button>
                </Link>
                <Link to="/speakers">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Discover Expert Speakers
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Speaking the Change
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
