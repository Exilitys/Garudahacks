import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Send,
  Search,
  Filter,
  Calendar,
  Mic2,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  Paperclip,
  Smile,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  participant_name: string;
  participant_type: "speaker" | "organizer";
  participant_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  event_title?: string;
  event_id?: string;
  status: "active" | "archived";
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  timestamp: string;
  message_type: "text" | "system" | "event_update";
  is_read: boolean;
}

const ChatPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    user_type: string;
    full_name: string;
    avatar_url?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      markConversationAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUserProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_type, full_name, avatar_url")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setUserProfile(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration - conversations vary based on user type
      let mockConversations: Conversation[] = [];

      if (userProfile?.user_type === "speaker") {
        // For speakers: show conversations with event organizers
        mockConversations = [
          {
            id: "conv-1",
            participant_name: "Dr. Sarah Johnson",
            participant_type: "organizer",
            participant_avatar: undefined,
            last_message:
              "Looking forward to discussing the event details with you.",
            last_message_time: new Date(
              Date.now() - 1000 * 60 * 30
            ).toISOString(), // 30 mins ago
            unread_count: 2,
            event_title: "Tech Innovation Summit 2025",
            event_id: "event-1",
            status: "active",
          },
          {
            id: "conv-2",
            participant_name: "Mark Chen",
            participant_type: "organizer",
            participant_avatar: undefined,
            last_message:
              "Thank you for accepting the invitation. Here are the event details...",
            last_message_time: new Date(
              Date.now() - 1000 * 60 * 60 * 2
            ).toISOString(), // 2 hours ago
            unread_count: 0,
            event_title: "Digital Marketing Workshop",
            event_id: "event-2",
            status: "active",
          },
          {
            id: "conv-3",
            participant_name: "Lisa Wang",
            participant_type: "organizer",
            participant_avatar: undefined,
            last_message:
              "The event was successful! Thank you for your presentation.",
            last_message_time: new Date(
              Date.now() - 1000 * 60 * 60 * 24
            ).toISOString(), // 1 day ago
            unread_count: 0,
            event_title: "AI in Business Conference",
            event_id: "event-3",
            status: "archived",
          },
          {
            id: "conv-4",
            participant_name: "Alex Rodriguez",
            participant_type: "organizer",
            participant_avatar: undefined,
            last_message:
              "Hi! We'd love to have you speak at our upcoming startup pitch event.",
            last_message_time: new Date(
              Date.now() - 1000 * 60 * 60 * 6
            ).toISOString(), // 6 hours ago
            unread_count: 1,
            event_title: "Startup Pitch Night",
            event_id: "event-4",
            status: "active",
          },
        ];
      } else {
        // For organizers: show conversations with speakers
        mockConversations = [
          {
            id: "conv-1",
            participant_name: "Dr. Michael Thompson",
            participant_type: "speaker",
            participant_avatar: undefined,
            last_message:
              "I'm very interested in your blockchain conference. When can we discuss the details?",
            last_message_time: new Date(
              Date.now() - 1000 * 60 * 45
            ).toISOString(), // 45 mins ago
            unread_count: 1,
            event_title: "Blockchain & Future Finance",
            event_id: "event-1",
            status: "active",
          },
          {
            id: "conv-2",
            participant_name: "Prof. Emily Davis",
            participant_type: "speaker",
            participant_avatar: undefined,
            last_message:
              "Thank you for the opportunity! I've prepared the presentation materials.",
            last_message_time: new Date(
              Date.now() - 1000 * 60 * 60 * 3
            ).toISOString(), // 3 hours ago
            unread_count: 0,
            event_title: "Women in Tech Summit",
            event_id: "event-2",
            status: "active",
          },
          {
            id: "conv-3",
            participant_name: "Dr. James Wilson",
            participant_type: "speaker",
            participant_avatar: undefined,
            last_message:
              "The workshop went great! Looking forward to future collaborations.",
            last_message_time: new Date(
              Date.now() - 1000 * 60 * 60 * 48
            ).toISOString(), // 2 days ago
            unread_count: 0,
            event_title: "Data Science Workshop",
            event_id: "event-3",
            status: "archived",
          },
          {
            id: "conv-4",
            participant_name: "Maria Garcia",
            participant_type: "speaker",
            participant_avatar: undefined,
            last_message:
              "I'd be happy to speak about sustainable business practices at your event.",
            last_message_time: new Date(
              Date.now() - 1000 * 60 * 60 * 8
            ).toISOString(), // 8 hours ago
            unread_count: 2,
            event_title: "Green Business Conference",
            event_id: "event-4",
            status: "active",
          },
        ];
      }

      setConversations(mockConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error loading conversations",
        description: "Unable to load your chat conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      // Mock messages for demonstration - different messages based on user type
      let mockMessages: Message[] = [];

      if (userProfile?.user_type === "speaker") {
        // Messages from organizer's perspective (speaker receiving messages from organizers)
        mockMessages = [
          {
            id: "msg-1",
            content:
              "Hi! I'm interested in having you speak at our upcoming tech summit.",
            sender_id: "other-user",
            sender_name: "Dr. Sarah Johnson",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            message_type: "text",
            is_read: true,
          },
          {
            id: "msg-2",
            content:
              "Hello Dr. Johnson! Thank you for reaching out. I'd be happy to discuss the opportunity. Could you share more details about the event?",
            sender_id: user?.id || "",
            sender_name: userProfile?.full_name || "You",
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            message_type: "text",
            is_read: true,
          },
          {
            id: "msg-3",
            content:
              "The event is scheduled for March 15th, 2025. It's a full-day conference focusing on emerging technologies. We're expecting about 300 attendees.",
            sender_id: "other-user",
            sender_name: "Dr. Sarah Johnson",
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            message_type: "text",
            is_read: true,
          },
          {
            id: "msg-4",
            content:
              "That sounds fantastic! I have experience speaking at similar events. What specific topics would you like me to cover?",
            sender_id: user?.id || "",
            sender_name: userProfile?.full_name || "You",
            timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
            message_type: "text",
            is_read: true,
          },
          {
            id: "msg-5",
            content:
              "Looking forward to discussing the event details with you.",
            sender_id: "other-user",
            sender_name: "Dr. Sarah Johnson",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            message_type: "text",
            is_read: false,
          },
        ];
      } else {
        // Messages from organizer's perspective (organizer receiving messages from speakers)
        mockMessages = [
          {
            id: "msg-1",
            content:
              "Hello! I saw your event posting for the blockchain conference. I'm very interested in speaking about DeFi innovations.",
            sender_id: "other-user",
            sender_name: "Dr. Michael Thompson",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            message_type: "text",
            is_read: true,
          },
          {
            id: "msg-2",
            content:
              "Hi Dr. Thompson! Thank you for your interest. Your expertise in DeFi would be perfect for our audience. Could you tell me more about your proposed presentation?",
            sender_id: user?.id || "",
            sender_name: userProfile?.full_name || "You",
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            message_type: "text",
            is_read: true,
          },
          {
            id: "msg-3",
            content:
              "I'd like to present on 'The Future of Decentralized Finance: Beyond Traditional Banking'. I can cover technical aspects as well as real-world applications.",
            sender_id: "other-user",
            sender_name: "Dr. Michael Thompson",
            timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
            message_type: "text",
            is_read: true,
          },
          {
            id: "msg-4",
            content:
              "That sounds excellent! What's your speaking fee for a 60-minute presentation?",
            sender_id: user?.id || "",
            sender_name: userProfile?.full_name || "You",
            timestamp: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
            message_type: "text",
            is_read: true,
          },
          {
            id: "msg-5",
            content:
              "I'm very interested in your blockchain conference. When can we discuss the details?",
            sender_id: "other-user",
            sender_name: "Dr. Michael Thompson",
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            message_type: "text",
            is_read: false,
          },
        ];
      }

      setMessages(mockMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    // Update the conversation to mark as read
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      )
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageId = `msg-${Date.now()}`;
    const newMsg: Message = {
      id: messageId,
      content: newMessage.trim(),
      sender_id: user?.id || "",
      sender_name: userProfile?.full_name || "You",
      timestamp: new Date().toISOString(),
      message_type: "text",
      is_read: true,
    };

    // Add message to current conversation
    setMessages((prev) => [...prev, newMsg]);

    // Update conversation with last message
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation
          ? {
              ...conv,
              last_message: newMessage.trim(),
              last_message_time: new Date().toISOString(),
            }
          : conv
      )
    );

    setNewMessage("");

    // In a real app, you would send this to your backend
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: "Message sent",
        description: "Your message has been delivered successfully.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error sending message",
        description: "Unable to send your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.event_title?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "unread" && conv.unread_count > 0) ||
      (filterStatus === "active" && conv.status === "active") ||
      (filterStatus === "archived" && conv.status === "archived");

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Chat</h1>
          <p className="text-muted-foreground mt-2">
            Communicate with{" "}
            {userProfile?.user_type === "speaker"
              ? "event organizers"
              : "speakers"}{" "}
            about your events and opportunities
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="mr-2 h-5 w-5" />
                Conversations
              </CardTitle>
              <CardDescription>
                {filteredConversations.length} conversation
                {filteredConversations.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Search and Filter */}
              <div className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conversations</SelectItem>
                    <SelectItem value="unread">Unread Messages</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Conversations List */}
              <ScrollArea className="h-[calc(100vh-20rem)]">
                <div className="p-2">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        No conversations found
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {searchQuery
                          ? "Try adjusting your search"
                          : "Start chatting with speakers or organizers"}
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation === conversation.id
                            ? "bg-primary/10 border-primary/20 border"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedConversation(conversation.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={conversation.participant_avatar}
                            />
                            <AvatarFallback>
                              {conversation.participant_name
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm truncate">
                                {conversation.participant_name}
                              </h4>
                              <div className="flex items-center space-x-1">
                                {conversation.participant_type === "speaker" ? (
                                  <Mic2 className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <Building className="h-3 w-3 text-muted-foreground" />
                                )}
                                {conversation.unread_count > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {conversation.unread_count}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {conversation.event_title && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                📅 {conversation.event_title}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {conversation.last_message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(
                                new Date(conversation.last_message_time),
                                { addSuffix: true }
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          conversations.find(
                            (c) => c.id === selectedConversation
                          )?.participant_avatar
                        }
                      />
                      <AvatarFallback>
                        {conversations
                          .find((c) => c.id === selectedConversation)
                          ?.participant_name.charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">
                        {
                          conversations.find(
                            (c) => c.id === selectedConversation
                          )?.participant_name
                        }
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        {conversations.find(
                          (c) => c.id === selectedConversation
                        )?.participant_type === "speaker" ? (
                          <>
                            <Mic2 className="h-3 w-3" /> Speaker
                          </>
                        ) : (
                          <>
                            <Building className="h-3 w-3" /> Event Organizer
                          </>
                        )}
                        {conversations.find(
                          (c) => c.id === selectedConversation
                        )?.event_title && (
                          <>
                            <span>•</span>
                            <span>
                              {
                                conversations.find(
                                  (c) => c.id === selectedConversation
                                )?.event_title
                              }
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="h-[calc(100vh-24rem)]">
                  <div className="p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === user?.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            message.sender_id === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.sender_id === user?.id
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatDistanceToNow(new Date(message.timestamp), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        className="pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-8 w-8"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a conversation from the list to start chatting
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
