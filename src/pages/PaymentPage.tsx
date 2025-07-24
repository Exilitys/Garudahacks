import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  CreditCard,
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface BookingDetails {
  id: string;
  agreed_rate: number;
  payment_amount?: number;
  status: string;
  speaker: {
    id: string;
    hourly_rate?: number;
    profile: {
      full_name: string;
      avatar_url?: string;
      email: string;
    };
    experience_level: string;
    average_rating: number;
  };
  event: {
    id: string;
    title: string;
    date_time: string;
    location?: string;
    format: string;
    duration_hours: number;
  };
}

const PaymentPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "",
    card_number: "",
    expiry: "",
    cvv: "",
    cardholder_name: "",
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    if (!bookingId) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          speaker:speakers!speaker_id(
            id,
            hourly_rate,
            experience_level,
            average_rating,
            profile:profiles!profile_id(full_name, avatar_url, email)
          ),
          event:events!event_id(id, title, date_time, location, format, duration_hours)
        `
        )
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      setBooking(data);

      // Check if payment is already completed (check for 'paid' status)
      setPaymentCompleted(data.status === "paid");
    } catch (error) {
      console.error("Error fetching booking details:", error);
      toast({
        title: "Error loading payment details",
        description: "Unable to load booking information",
        variant: "destructive",
      });
      navigate("/my-events");
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!booking || !user) return;

    setProcessing(true);

    try {
      // Calculate the actual payment amount
      const calculatedAmount =
        (booking.speaker.hourly_rate || 0) * booking.event.duration_hours;
      const finalPaymentAmount =
        booking.payment_amount || calculatedAmount || booking.agreed_rate;

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate a mock payment reference
      const paymentReference = `PAY-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;

      // Update the booking status to indicate payment is completed
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "paid", // Use 'paid' status to indicate payment completed
          payment_amount: finalPaymentAmount, // Store the calculated amount
          payment_reference: paymentReference,
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (updateError) throw updateError;

      toast({
        title: "Payment successful!",
        description: `Payment of $${
          finalPaymentAmount / 100
        } has been processed. Reference: ${paymentReference}`,
      });

      setShowConfirmDialog(false);
      setPaymentCompleted(true);

      // Refresh booking details to show updated status
      await fetchBookingDetails();

      // Navigate back after a short delay
      setTimeout(() => {
        navigate("/my-events");
      }, 3000);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment failed",
        description:
          "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading payment details...
          </p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Payment not found</h3>
          <p className="text-muted-foreground mb-4">
            The payment you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/my-events")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Events
          </Button>
        </div>
      </div>
    );
  }

  // Calculate payment amount: hourly_rate × duration_hours
  const calculatedAmount =
    (booking.speaker.hourly_rate || 0) * booking.event.duration_hours;
  const paymentAmount =
    booking.payment_amount || calculatedAmount || booking.agreed_rate;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/my-events")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Events
        </Button>

        {/* Payment Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Speaker Payment</h1>
                <p className="text-muted-foreground">
                  Payment for speaking services
                </p>
              </div>
              {paymentCompleted ? (
                <Badge
                  variant="default"
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Payment Completed
                </Badge>
              ) : (
                <Badge variant="outline">Payment Required</Badge>
              )}
            </div>

            {paymentCompleted && (
              <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="font-medium text-green-800">
                      Payment completed
                    </p>
                    <p className="text-sm text-green-600">
                      The speaker has been notified and can now attend the
                      event.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!paymentCompleted && (
              <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="font-medium text-blue-800">
                      Payment required to confirm speaker
                    </p>
                    <p className="text-sm text-blue-600">
                      Complete payment within 2 days of speaker acceptance
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Speaker payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Calculation Breakdown */}
              <div className="space-y-3">
                <h4 className="font-medium">Payment Calculation</h4>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Hourly Rate</span>
                    <span>
                      ${(booking.speaker.hourly_rate || 0) / 100}/hour
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Event Duration</span>
                    <span>{booking.event.duration_hours} hours</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between font-medium">
                    <span>Total Amount</span>
                    <span className="text-lg">${paymentAmount / 100}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Payment Status</span>
                {paymentCompleted ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Paid
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
              <Separator />

              {/* Speaker Information */}
              <div className="space-y-3">
                <h4 className="font-medium">Speaker</h4>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={booking.speaker.profile.avatar_url} />
                    <AvatarFallback>
                      {booking.speaker.profile.full_name
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {booking.speaker.profile.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.speaker.experience_level} • ⭐{" "}
                      {booking.speaker.average_rating.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Event Information */}
              <div className="space-y-3">
                <h4 className="font-medium">Event</h4>
                <div className="space-y-2">
                  <p className="font-medium">{booking.event.title}</p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-3 w-3" />
                    {formatDate(booking.event.date_time)}
                  </div>
                  {booking.event.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-2 h-3 w-3" />
                      {booking.event.location}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {booking.event.format}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          {!paymentCompleted && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Complete the payment to confirm the speaker
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(value) =>
                      setPaymentForm({ ...paymentForm, payment_method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentForm.payment_method === "credit_card" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cardholder-name">Cardholder Name</Label>
                      <Input
                        id="cardholder-name"
                        value={paymentForm.cardholder_name}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            cardholder_name: e.target.value,
                          })
                        }
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card-number">Card Number</Label>
                      <Input
                        id="card-number"
                        value={paymentForm.card_number}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            card_number: e.target.value,
                          })
                        }
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          value={paymentForm.expiry}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              expiry: e.target.value,
                            })
                          }
                          placeholder="MM/YY"
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={paymentForm.cvv}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              cvv: e.target.value,
                            })
                          }
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4">
                  <Dialog
                    open={showConfirmDialog}
                    onOpenChange={setShowConfirmDialog}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={!paymentForm.payment_method}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay ${paymentAmount / 100}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Payment</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to process this payment?
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/50">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Amount</span>
                            <span className="text-lg font-bold">
                              ${paymentAmount / 100}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Speaker
                            </span>
                            <span className="text-sm">
                              {booking.speaker.profile.full_name}
                            </span>
                          </div>
                        </div>

                        <div className="flex space-x-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowConfirmDialog(false)}
                            className="flex-1"
                            disabled={processing}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={processPayment}
                            disabled={processing}
                            className="flex-1"
                          >
                            {processing && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Confirm Payment
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
