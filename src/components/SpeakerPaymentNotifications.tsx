import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  MapPin,
  DollarSign,
} from "lucide-react";

interface PaymentNotification {
  id: string;
  agreed_rate: number;
  status: string;
  created_at: string;
  event: {
    id: string;
    title: string;
    date_time: string;
    location?: string;
  };
}

const SpeakerPaymentNotifications = () => {
  const [paymentNotifications, setPaymentNotifications] = useState<
    PaymentNotification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPaymentNotifications();
    }
  }, [user]);

  const fetchPaymentNotifications = async () => {
    if (!user) return;

    try {
      // Get user's profile ID first
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Get speaker ID for the current user
      const { data: speakerData, error: speakerError } = await supabase
        .from("speakers")
        .select("id")
        .eq("profile_id", profile.id)
        .single();

      if (speakerError) {
        // User is not a speaker, no notifications to show
        setLoading(false);
        return;
      }

      // Fetch accepted and paid bookings for this speaker
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          event:events!event_id(id, title, date_time, location)
        `
        )
        .eq("speaker_id", speakerData.id)
        .in("status", ["accepted", "paid"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPaymentNotifications(data || []);
    } catch (error) {
      console.error("Error fetching payment notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    if (status === "paid") {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Payment Received
        </Badge>
      );
    } else if (status === "accepted") {
      return (
        <Badge variant="outline">
          <Clock className="mr-1 h-3 w-3" />
          Payment Pending
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getPaymentStatusMessage = (booking: PaymentNotification) => {
    if (booking.status === "paid") {
      return {
        title: "Payment Confirmed",
        message:
          "The event organizer has completed payment. You can now attend the event.",
        variant: "success" as const,
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      };
    } else if (booking.status === "accepted") {
      return {
        title: "Payment Pending",
        message:
          "You have been accepted! The organizer has 2 days to complete payment.",
        variant: "warning" as const,
        icon: <Clock className="h-5 w-5 text-yellow-600" />,
      };
    }
    return {
      title: "Status Update",
      message: "Your application status has been updated.",
      variant: "info" as const,
      icon: <AlertTriangle className="h-5 w-5 text-blue-600" />,
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentNotifications.length === 0) {
    return null; // Don't show anything if no notifications
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Status</CardTitle>
        <CardDescription>
          Payment notifications for your confirmed speaking engagements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentNotifications.map((booking) => {
          const statusInfo = getPaymentStatusMessage(booking);

          return (
            <div
              key={booking.id}
              className={`p-4 rounded-lg border ${
                statusInfo.variant === "success"
                  ? "bg-green-50 border-green-200"
                  : statusInfo.variant === "warning"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start space-x-3">
                {statusInfo.icon}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{booking.event.title}</h4>
                    {getPaymentStatusBadge(booking.status)}
                  </div>

                  <p
                    className={`text-sm ${
                      statusInfo.variant === "success"
                        ? "text-green-800"
                        : statusInfo.variant === "warning"
                        ? "text-yellow-800"
                        : "text-red-800"
                    }`}
                  >
                    <strong>{statusInfo.title}:</strong> {statusInfo.message}
                  </p>

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-3 w-3" />
                      Event: {formatDate(booking.event.date_time)}
                    </div>
                    {booking.event.location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-2 h-3 w-3" />
                        {booking.event.location}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <DollarSign className="mr-2 h-3 w-3" />
                      Speaker fee: Rp
                      {booking.agreed_rate.toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SpeakerPaymentNotifications;
