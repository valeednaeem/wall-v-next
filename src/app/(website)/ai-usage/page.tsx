import { Metadata } from "next";
import LegalPageView, { generateLegalMetadata } from "@/components/legal/legal-page-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalMetadata("ai-usage", "AI Usage & Limitations Policy");
}

export default function AiUsagePage() {
  return (
    <LegalPageView
      slug="ai-usage"
      fallbackTitle="AI Usage & Limitations Policy"
      fallbackContent={`
        <h2>1. Overview</h2>
        <p>Wall-V provides AI-powered tools and services to assist with software development, content generation, data analysis, and other tasks. This policy describes how our AI services work, their limitations, and your responsibilities when using them.</p>

        <h2>2. How Our AI Works</h2>
        <p>Our AI systems use machine learning models to process inputs and generate outputs. These models are trained on large datasets and use statistical patterns to produce responses. They do not "understand" content in the human sense and operate based on pattern recognition and probability.</p>

        <h2>3. AI Limitations</h2>
        <p>Users should be aware of the following limitations:</p>
        <ul>
          <li><strong>Inaccuracy:</strong> AI may generate factually incorrect or outdated information</li>
          <li><strong>Hallucinations:</strong> AI may produce outputs that are entirely fabricated</li>
          <li><strong>Bias:</strong> AI outputs may reflect biases present in training data</li>
          <li><strong>Inconsistency:</strong> Similar inputs may produce different outputs</li>
          <li><strong>Lack of context:</strong> AI may miss important contextual nuances</li>
          <li><strong>No real-time data:</strong> AI may not have access to current information</li>
          <li><strong>Limited reasoning:</strong> AI may struggle with complex logic or math</li>
        </ul>

        <h2>4. User Responsibilities</h2>
        <p>When using our AI services, you are responsible for:</p>
        <ul>
          <li>Verifying the accuracy of all AI-generated output</li>
          <li>Not relying solely on AI for critical decisions</li>
          <li>Reviewing AI-generated code for security vulnerabilities</li>
          <li>Ensuring AI outputs comply with applicable laws and regulations</li>
          <li>Not using AI to generate harmful, misleading, or illegal content</li>
          <li>Understanding the limitations described in this policy</li>
        </ul>

        <h2>5. AI-Generated Content Ownership</h2>
        <p>Ownership of AI-generated content depends on the specific service agreement:</p>
        <ul>
          <li>For custom development projects: ownership transfers upon full payment</li>
          <li>For subscription services: you receive a license to use generated content</li>
          <li>For free tier usage: limited rights to use generated content commercially</li>
        </ul>

        <h2>6. Data Used by AI</h2>
        <p>Our AI systems may process data you provide to generate responses. We do not use your proprietary data to train our models without explicit consent. Please refer to our Privacy Policy for details on data handling.</p>

        <h2>7. Prohibited AI Uses</h2>
        <p>You may not use our AI services to:</p>
        <ul>
          <li>Generate content designed to deceive or manipulate</li>
          <li>Create deepfakes or impersonate individuals</li>
          <li>Develop weapons or harmful technologies</li>
          <li>Automate decisions that significantly affect individuals without human oversight</li>
          <li>Violate intellectual property rights</li>
          <li>Bypass content moderation or safety systems</li>
        </ul>

        <h2>8. Service Availability</h2>
        <p>AI services may be temporarily unavailable due to model updates, maintenance, or capacity constraints. We do not guarantee continuous availability of specific AI features.</p>

        <h2>9. Updates to This Policy</h2>
        <p>As AI technology evolves, we may update this policy. Significant changes will be communicated through our website or email.</p>

        <h2>10. Contact</h2>
        <p>For questions about our AI services, contact us at ai-support@wall-v.com.</p>
      `}
    />
  );
}
