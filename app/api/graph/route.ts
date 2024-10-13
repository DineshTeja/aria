import { NextResponse } from 'next/server'
import { createGraphFromArticles } from './services'
import { Groq } from 'groq-sdk'

export async function POST(request: Request) {
  try {
    const { articles } = await request.json()
    const graphDocument = await createGraphFromArticles(articles.join('\n'))

    const nodes = graphDocument.nodes
      .map(node => `${node.id.toString().replace(' ', '_')}[${node.type}: ${node.properties.name || node.id}]`)
      .join(' ')

    const relationships = graphDocument.relationships
      .map(rel => `${rel.source.id.toString().replace(' ', '_')} --> |${rel.type.toLowerCase().replace(/_/g, ' ')}| ${rel.target.id.toString().replace(' ', '_')}`)
      .join(' ')

    const graph = `graph TD ${nodes} ${relationships}`

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })

    try {
      const response = await groq.chat.completions.create({
        model: 'llama3-11b-text-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Mermaid syntax. Correct the following Mermaid code to ensure it\'s correct. Only give the mermaid code, nothing else.',
          },
          {
            role: 'user',
            content: graph,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      })

      const result = response.choices[0].message.content || graph
      return NextResponse.json({ graphs: result }, { status: 200 })
    } catch (error) {
      console.error('Error optimizing Mermaid code:', error)
      return NextResponse.json({ graphs: graph }, { status: 200 })
    }
  } catch (error) {
    console.error('Error creating graph:', error)
    return NextResponse.json({ error: 'Failed to create graph' }, { status: 500 })
  }
}