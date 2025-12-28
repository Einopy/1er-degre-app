import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRecipient {
  email: string;
  name: string;
}

interface SendEmailRequest {
  recipients: EmailRecipient[];
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

interface BrevoEmailPayload {
  sender: {
    name: string;
    email: string;
  };
  to: Array<{
    email: string;
    name: string;
  }>;
  subject: string;
  htmlContent: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");

    if (!brevoApiKey) {
      console.error("BREVO_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({
          error: "Email service not configured",
          message: "BREVO_API_KEY environment variable is not set",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: SendEmailRequest = await req.json();

    const { recipients, subject, htmlContent, senderName, senderEmail } = requestData;

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: "Subject and HTML content are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isTestEmail = subject.includes("[TEST]");

    const brevoPayload: BrevoEmailPayload = {
      sender: {
        name: senderName || "1er Degré",
        email: senderEmail || "hello@1erdegre.earth",
      },
      to: recipients.map((recipient) => ({
        email: recipient.email,
        name: recipient.name || recipient.email,
      })),
      subject,
      htmlContent,
    };

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    if (!brevoResponse.ok) {
      let errorDetails = "Unknown error";
      let parsedError: any = null;

      try {
        const contentType = brevoResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          parsedError = await brevoResponse.json();
          errorDetails = JSON.stringify(parsedError);
        } else {
          errorDetails = await brevoResponse.text();
        }
      } catch (parseError) {
        console.error("Failed to parse Brevo error response:", parseError);
        errorDetails = "Unable to parse error response from email service";
      }

      console.error("Brevo API error:", {
        status: brevoResponse.status,
        statusText: brevoResponse.statusText,
        errorDetails,
        parsedError,
      });

      return new Response(
        JSON.stringify({
          error: "Failed to send email via Brevo",
          message: `Email service returned error (${brevoResponse.status})`,
          details: errorDetails,
        }),
        {
          status: brevoResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let responseData: any = { messageId: "unknown" };
    try {
      responseData = await brevoResponse.json();
    } catch (parseError) {
      console.warn("Email sent successfully but couldn't parse Brevo response:", parseError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messageId,
        recipientCount: recipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.constructor.name : typeof error,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});