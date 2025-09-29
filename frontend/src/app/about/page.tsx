import { ArrowRight, BrainCircuit, Code, Database, Layers, Wind, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import AnimatedHeading from '@/components/AnimatedHeading';
import FadeIn from '@/components/FadeIn';
import SpinnerBorder from '@/components/SpinnerBorder';
import Link from 'next/link';
import SpinnerButton from '@/components/SpinnerButton';

// --- A self-contained Section helper component for this page ---
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <section className="py-16 border-b border-white/10">
    <FadeIn>
      <h2 className="text-3xl md:text-4xl font-bold mb-8 text-[--text-accent]">{title}</h2>
    </FadeIn>
    {children}
  </section>
);

// --- The Main About Page Component ---
export default function AboutPage() {
  return (
    <div className="container mx-auto px-4">
      <AnimatedHeading text="Project Report: AgenticAI" />
      
      <Section title="1. Executive Summary">
        <FadeIn>
          <div className="space-y-4 text-lg text-white/80">
            <p>
              AgenticAI is a proof-of-concept web application designed to explore the intersection of modern productivity tools and conversational AI. It fundamentally reimagines the standard to-do list by augmenting a traditional, manual CRUD (Create, Read, Update, Delete) interface with a sophisticated, tool-using AI agent.
            </p>
            <p>
              The core thesis is that the future of user interfaces is not purely graphical or purely conversational, but a seamless hybrid. This project demonstrates a system where a user can choose their preferred mode of interaction—direct manipulation or natural language delegation—without sacrificing functionality or context. The agent acts as an intelligent partner, capable of understanding semantic intent, performing complex actions, and even controlling the application's UI, thereby reducing user friction and cognitive load.
            </p>
          </div>
        </FadeIn>
      </Section>
      
      <Section title="2. System Architecture & Technology Rationale">
        <FadeIn>
          <p className="mb-12 text-white/80">The application is built on a decoupled, high-performance stack. Each technology was selected to address specific project requirements, from real-time interactivity to complex AI reasoning.</p>
        </FadeIn>
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
          <FadeIn>
            <div className="bg-white/5 p-6 rounded-lg h-full border border-white/10">
              <div className="flex items-center gap-4 mb-3">
                <Layers size={24} className="text-[--text-accent]" />
                <h3 className="text-xl font-bold text-white">Frontend: Next.js</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-white/70">
                <li><strong>Reasoning:</strong> Chosen for its performance (Server-Side Rendering), rich developer experience (App Router, TypeScript support), and seamless integration with the React ecosystem.</li>
                <li><strong>Key Libraries:</strong> TailwindCSS for utility-first styling, Framer Motion for animations, Zustand for lightweight global state management (themes, filters), and TanStack Query (React Query) for robust server state management.</li>
              </ul>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
             <div className="bg-white/5 p-6 rounded-lg h-full border border-white/10">
              <div className="flex items-center gap-4 mb-3">
                <Wind size={24} className="text-[--text-accent]" />
                <h3 className="text-xl font-bold text-white">Backend: FastAPI</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-white/70">
                <li><strong>Reasoning:</strong> Python's extensive AI ecosystem makes it the natural choice. FastAPI was selected for its high performance and native `async` support, which is critical for non-blocking I/O during long-running calls to the Gemini AI API.</li>
                 <li><strong>Communication:</strong> Employs WebSockets for real-time, bidirectional communication, enabling the agent to push commands and updates to the frontend instantly.</li>
              </ul>
            </div>
          </FadeIn>
          <FadeIn delay={0.4}>
             <div className="bg-white/5 p-6 rounded-lg h-full border border-white/10">
              <div className="flex items-center gap-4 mb-3">
                <Database size={24} className="text-[--text-accent]" />
                <h3 className="text-xl font-bold text-white">Database: PostgreSQL + pgvector</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-white/70">
                <li><strong>Reasoning:</strong> A robust, open-source relational database. The `pgvector` extension is the cornerstone of the agent's intelligence, allowing for the storage and efficient similarity search of vector embeddings.</li>
                 <li><strong>Functionality:</strong> This transforms the database from a simple text store into a semantic knowledge base, enabling the agent to find tasks based on meaning and context.</li>
              </ul>
            </div>
          </FadeIn>
        </div>
      </Section>

      <Section title="3. The Agent's Brain: Design and Protocols">
         <FadeIn>
           <SpinnerBorder borderRadiusVar="--border-radius-card" className="card my-12">
             <div className="card-text-content p-8">
               <div className="flex items-center gap-4 mb-4">
                 <BrainCircuit size={32} className="text-[--text-accent]" />
                 <h3 className="text-2xl font-bold">LangGraph & Gemini 1.5 Flash</h3>
               </div>
               <p className="text-white/80 mb-6">
                 The agent's reasoning is not a simple AI call; it's a stateful graph built with LangGraph. This framework allows for cyclical, multi-step thought processes, which are essential for complex tasks. The agent's behavior is governed by a detailed system prompt containing a Knowledge Base and a set of Critical Reasoning Protocols.
               </p>
               <h4 className="font-bold text-white mb-2">Key Protocols:</h4>
               <ul className="list-disc pl-5 space-y-2 text-sm text-white/70">
                 <li><strong>Task Creation & Refinement:</strong> The agent first checks for duplicates, then asks clarifying questions for vague requests, and finally seeks confirmation before creating a to-do. This ensures high-quality, non-redundant data.</li>
                 <li><strong>Safe Deletion:</strong> For any destructive action, the agent follows a strict "Search - Propose Plan - Await Confirmation - Execute" loop. This human-in-the-loop process prevents accidental data loss.</li>
                 <li><strong>UI Control:</strong> The agent can manipulate the UI by calling a dedicated `perform_ui_action` tool, which broadcasts commands to the frontend via WebSockets.</li>
               </ul>
             </div>
           </SpinnerBorder>
         </FadeIn>
      </Section>

      <Section title="4. Technical Challenges & Solutions">
        <div className="space-y-10">
            <FadeIn>
                <div className="flex items-start gap-4">
                    <AlertTriangle className="w-10 h-10 text-yellow-400 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-white text-lg">Challenge: Agent Safety and Reliability</h4>
                        <p className="text-white/70 mt-1">An unconstrained AI agent can be unreliable and unsafe, performing incorrect actions or "hallucinating" capabilities. How do we ensure it acts predictably and safely?</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 mt-4">
                    <CheckCircle className="w-10 h-10 text-green-400 flex-shrink-0" />
                     <div>
                        <h4 className="font-bold text-white text-lg">Solution: Prompt-Driven Protocols & Tool Schemas</h4>
                        <p className="text-white/70 mt-1">We solved this by engineering a highly structured system prompt that serves as an immutable operational manual for the agent. By defining explicit multi-step protocols (e.g., for deletion), we force the agent into a safe reasoning path. Furthermore, using Pydantic schemas for tool arguments ensures the agent's function calls are always correctly formatted.</p>
                    </div>
                </div>
            </FadeIn>
             <FadeIn>
                <div className="flex items-start gap-4">
                     <AlertTriangle className="w-10 h-10 text-yellow-400 flex-shrink-0" />
                     <div>
                        <h4 className="font-bold text-white text-lg">Challenge: Real-time Agent-UI Synchronization</h4>
                        <p className="text-white/70 mt-1">Actions performed by the agent (backend) must be reflected in the user's interface (frontend) instantly, without requiring a page refresh.</p>
                     </div>
                </div>
                 <div className="flex items-start gap-4 mt-4">
                    <CheckCircle className="w-10 h-10 text-green-400 flex-shrink-0" />
                     <div>
                        <h4 className="font-bold text-white text-lg">Solution: Bidirectional Communication with WebSockets</h4>
                        <p className="text-white/70 mt-1">A WebSocket connection is established between the client and server. The agent's tools are programmed to broadcast structured JSON commands (e.g., `data_update`, `ui_action`) upon completion. A global manager on the frontend listens for these commands and triggers the appropriate client-side state changes, creating a seamless and reactive user experience.</p>
                     </div>
                </div>
            </FadeIn>
        </div>
      </Section>
      
      <Section title="5. Future Prospects & Learning">
        <FadeIn>
            <p className="text-white/80 mb-6">
              This project serves as a robust foundation for more advanced agentic systems. Potential future enhancements include:
            </p>
            <ul className="list-disc pl-5 space-y-3 text-white/70">
                <li><strong>Proactive Agency:</strong> Developing a mechanism for the agent to initiate conversations based on triggers, such as an upcoming to-do deadline.</li>
                <li><strong>Third-Party Tool Integration:</strong> Giving the agent tools to connect to external APIs, such as Google Calendar for scheduling or a weather API for planning outdoor activities.</li>
                <li><strong>Memory Evolution:</strong> Migrating from a simple conversational window memory to a long-term vector-based memory, allowing the agent to remember user preferences and facts across sessions.</li>
                <li><strong>Advanced Planning:</strong> Enhancing the LangGraph agent to handle more complex, long-term goals by breaking them down into hierarchical sub-tasks and tracking progress over time.</li>
            </ul>
        </FadeIn>
      </Section>

      <div className="text-center py-20">
         <FadeIn>
           <h3 className="text-3xl font-bold mb-4">Explore the Project</h3>
           <p className="text-[--text-secondary] mb-8">Dive into the code to see how it works or launch the app to interact with the agent.</p>
           <div className="flex justify-center gap-4">
              <Link href="/todo">
                 <SpinnerButton>Launch App</SpinnerButton>
              </Link>
              <a href="https://github.com/AakaAltair/lang-graph-agentic-todo-app.git" target="_blank" rel="noopener noreferrer">
                 <SpinnerButton>View on GitHub</SpinnerButton>
              </a>
           </div>
         </FadeIn>
      </div>

    </div>
  );
}