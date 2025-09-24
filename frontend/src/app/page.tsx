import Link from 'next/link';
import { Bot, Edit, Palette, Search, BrainCircuit, MessageSquare, ArrowRight } from 'lucide-react';

// Import our animated components
import AnimatedHeading from '@/components/AnimatedHeading';
import FadeIn from '@/components/FadeIn';
import SpinnerButton from '@/components/SpinnerButton';
import SpinnerBorder from '@/components/SpinnerBorder';

// --- Helper Component for Use Case Cards ---
const UseCaseCard = ({ title, userQuery, agentResponse, children }: { title: string, userQuery: string, agentResponse: string, children: React.ReactNode }) => (
  <FadeIn>
    <SpinnerBorder borderRadiusVar="--border-radius-card" className="card h-full">
      <div className="card-text-content p-6 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <BrainCircuit size={24} className="text-[--text-accent]" />
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <p className="text-[--text-secondary] text-sm mb-6 flex-grow">{children}</p>
        
        {/* Mock chat conversation */}
        <div className="space-y-3 text-sm">
          <div className="p-3 rounded-lg bg-blue-800 text-white rounded-br-none self-end max-w-[85%] ml-auto">
            <p className="m-0">{userQuery}</p>
          </div>
          <div className="flex items-end gap-2 self-start">
             <div className="w-8 h-8 rounded-full bg-slate-900/50 flex-shrink-0 flex items-center justify-center">
               <Bot size={20} className="text-[--text-accent]/70" />
             </div>
             <div className="p-3 rounded-lg bg-slate-900/60 text-white/90 rounded-bl-none max-w-[85%]">
               <p className="m-0">{agentResponse}</p>
             </div>
          </div>
        </div>
      </div>
    </SpinnerBorder>
  </FadeIn>
);


// --- The Main Home Page Component ---
export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      {/* 1. Hero Section */}
      <section className="min-h-screen flex items-center justify-center text-center -mt-16">
        <div className="container mx-auto px-4">
          <FadeIn>
            <h1 className="text-6xl md:text-8xl font-black mb-4">
              Your Personal <span className="text-[--text-accent]">Task Agent</span>.
            </h1>
            <p className="text-lg md:text-xl text-[--text-secondary] max-w-3xl mx-auto mb-8">
              Go beyond a simple list. AgenticAI is a conversational partner that helps you plan, organize, and execute your tasks with the power of AI.
            </p>
            <Link href="/todo">
              <SpinnerButton className="px-8 py-4 text-lg">
                Launch the App
              </SpinnerButton>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* 2. "Meet Your Agent" Section */}
      <section className="py-20 md:py-32 bg-black/20">
        <div className="container mx-auto px-4">
          <AnimatedHeading text="Meet Your AI Assistant" />
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div className="p-8 bg-white/5 rounded-lg text-center">
                <MessageSquare className="w-20 h-20 mx-auto mb-6 text-[--text-accent]" />
                <h2 className="text-3xl font-bold mb-4">A Conversational Interface</h2>
                <p className="text-[--text-secondary] mb-8">
                  Stop clicking, start talking. The floating chat window is your command center. Use natural language for everything from simple to-do creation to complex queries and UI control.
                </p>
                <Link href="/todo">
                   <SpinnerButton className="w-full">
                     Start Chatting Now <ArrowRight className="inline ml-2" size={16} />
                   </SpinnerButton>
                </Link>
              </div>
            </FadeIn>
            <FadeIn delay={0.3}>
              <h3 className="text-2xl font-bold mb-4">From simple commands...</h3>
              <p className="text-[--text-secondary] mb-6">Create, update, and delete tasks without ever leaving the chat.</p>
              
              <h3 className="text-2xl font-bold mb-4">...to intelligent actions.</h3>
              <p className="text-[--text-secondary]">
                Your agent can search, plan, check for duplicates, and even control the application's interface for you. It's not just a chatbot; it's an agent that gets things done.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>
      
      {/* 3. Use Cases Showcase Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedHeading text="What Can Your Agent Do?" />
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
            <UseCaseCard
              title="Intelligent Creation & Planning"
              userQuery="I need to plan a team lunch."
              agentResponse="Okay, a team lunch! To get started, what's the budget per person and are there any dietary restrictions I should know about?"
            >
              The agent doesn't just take orders. It asks clarifying questions to help you build detailed, actionable to-dos. It can check for duplicates to keep your list clean.
            </UseCaseCard>

            <UseCaseCard
              title="Advanced Retrieval"
              userQuery="Show me my tasks related to the 'Orion Project' from last month."
              agentResponse="Searching... I found two tasks: [1. Finalize Orion budget report], [2. Schedule kickoff meeting with the Orion team]."
            >
              Go beyond keyword search. The agent understands the *meaning* behind your words, finding tasks by topic, concept, or date range.
            </UseCaseCard>
            
            <UseCaseCard
              title="Safe Bulk Operations"
              userQuery="Delete all my completed tasks related to sports."
              agentResponse="I found 2 completed sports tasks: [1. Buy new running shoes], [2. Sign up for the 5k race]. Are you sure you want to delete these?"
            >
              For destructive actions like deleting multiple items, the agent will always propose a plan and ask for your confirmation, preventing costly mistakes.
            </UseCaseCard>
          </div>
           <div className="text-center mt-16">
             <Link href="/todo">
               <SpinnerButton className="px-8 py-3 text-lg">
                 Test These Features <ArrowRight className="inline ml-2" size={16} />
               </SpinnerButton>
             </Link>
           </div>
        </div>
      </section>

      {/* 4. Final CTA Section */}
      <section className="py-20 md:py-32 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-black mb-4">The Future of Productivity is Conversational</h2>
            <p className="text-lg text-[--text-secondary] max-w-3xl mx-auto mb-8">
              Stop managing lists and start achieving goals. Let your agent handle the administrative work so you can focus on what's important.
            </p>
            <Link href="/todo">
              <SpinnerButton className="px-10 py-4 text-xl">
                Launch the App and Meet Your Agent
              </SpinnerButton>
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}