// Chat Store - Gestión de conversaciones y historial
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { BaseStore } from './base-store';
import { ChatMessage, Conversation } from '../types';

// Estado del store de chat
export interface ChatState {
  currentConversation: Conversation | null;
  conversations: Conversation[];
  isProcessing: boolean;
  lastMessageId: string;
  totalMessages: number;
  searchQuery: string;
  filteredConversations: Conversation[];
  currentModel: string;
  maxConversations: number;
}

export class ChatStore extends BaseStore<ChatState> {
  private chatDataPath: string;
  private conversationsPath: string;

  constructor() {
    super(ChatStore.getDefaultState());
    const userDataPath = app.getPath('userData');
    this.chatDataPath = path.join(userDataPath, 'chat-data');
    this.conversationsPath = path.join(this.chatDataPath, 'conversations.json');
    
    // Crear directorio si no existe
    if (!fs.existsSync(this.chatDataPath)) {
      fs.mkdirSync(this.chatDataPath, { recursive: true });
    }
  }

  // Estado por defecto
  private static getDefaultState(): ChatState {
    return {
      currentConversation: null,
      conversations: [],
      isProcessing: false,
      lastMessageId: '',
      totalMessages: 0,
      searchQuery: '',
      filteredConversations: [],
      currentModel: 'gemini-2.5-flash',
      maxConversations: 100
    };
  }

  protected getInitialState(): ChatState {
    return ChatStore.getDefaultState();
  }

  // Cargar conversaciones desde archivo
  protected async load(): Promise<void> {
    try {
      if (fs.existsSync(this.conversationsPath)) {
        const conversationsData = fs.readFileSync(this.conversationsPath, 'utf-8');
        const loadedConversations = JSON.parse(conversationsData);
        
        this.setState({
          conversations: loadedConversations,
          filteredConversations: loadedConversations,
          totalMessages: this.calculateTotalMessages(loadedConversations)
        });
        
        console.log(`Cargadas ${loadedConversations.length} conversaciones`);
      } else {
        console.log('No se encontraron conversaciones previas');
      }
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
      this.setState(ChatStore.getDefaultState());
    }
  }

  // Guardar conversaciones en archivo
  protected async save(): Promise<void> {
    try {
      const conversationsToSave = this.state.conversations.map(conv => ({
        ...conv,
        // Limitar el número de mensajes por conversación para evitar archivos muy grandes
        messages: conv.messages.slice(-50) // Mantener solo los últimos 50 mensajes
      }));

      fs.writeFileSync(this.conversationsPath, JSON.stringify(conversationsToSave, null, 2));
      console.log(`Guardadas ${conversationsToSave.length} conversaciones`);
    } catch (error) {
      console.error('Error al guardar conversaciones:', error);
      throw error;
    }
  }

  // Calcular total de mensajes
  private calculateTotalMessages(conversations: Conversation[]): number {
    return conversations.reduce((total, conv) => total + conv.messages.length, 0);
  }

  // Generar ID único
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generar título automático basado en el primer mensaje
  private generateTitle(firstMessage: string): string {
    const maxLength = 50;
    const cleanMessage = firstMessage.trim().replace(/\n/g, ' ');
    
    if (cleanMessage.length <= maxLength) {
      return cleanMessage;
    }
    
    return cleanMessage.substring(0, maxLength) + '...';
  }

  // Métodos públicos para gestión de chat

  // Obtener todas las conversaciones
  getAllConversations(): Conversation[] {
    return this.state.conversations.map(conv => ({
      ...conv,
      messageCount: conv.messages.length,
      lastMessage: conv.messages[conv.messages.length - 1]?.content || ''
    }));
  }

  // Cargar una conversación específica
  loadConversation(conversationId: string): Conversation | null {
    const conversation = this.state.conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      this.setState({
        currentConversation: conversation
      });
      return conversation;
    }
    return null;
  }

  // Crear nueva conversación
  async createConversation(firstMessage?: string): Promise<string> {
    const conversationId = this.generateId();
    const now = Date.now();
    
    const newConversation: Conversation = {
      id: conversationId,
      title: firstMessage ? this.generateTitle(firstMessage) : 'Nueva conversación',
      messages: [],
      createdAt: now,
      updatedAt: now,
      model: this.state.currentModel
    };

    const updatedConversations = [newConversation, ...this.state.conversations];
    
    // Limitar número máximo de conversaciones
    const limitedConversations = updatedConversations.slice(0, this.state.maxConversations);
    
    this.setState({
      currentConversation: newConversation,
      conversations: limitedConversations,
      filteredConversations: this.filterConversations(limitedConversations, this.state.searchQuery)
    });

    await this.save();
    return conversationId;
  }

  // Seleccionar conversación actual
  setCurrentConversation(conversationId: string): boolean {
    const conversation = this.state.conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      this.setState({ currentConversation: conversation });
      return true;
    }
    return false;
  }

  // Verificar si está en modo incógnito
  private isIncognitoMode(): boolean {
    // Importar configStore para verificar modo incógnito
    const { configStore } = require('./index');
    return configStore.get('incognitoMode');
  }

  // Agregar mensaje a la conversación actual
  async addMessage(content: string, role: 'user' | 'assistant', model?: string): Promise<string> {
    // Si está en modo incógnito, no guardar el mensaje
    if (this.isIncognitoMode()) {
      console.log('Modo incógnito activado - mensaje no guardado');
      return 'incognito-message';
    }

    if (!this.state.currentConversation) {
      await this.createConversation(role === 'user' ? content : undefined);
    }

    const messageId = this.generateId();
    const now = Date.now();
    
    const newMessage: ChatMessage = {
      id: messageId,
      role,
      content,
      timestamp: now,
      model: model || this.state.currentModel
    };

    const updatedConversation: Conversation = {
      ...this.state.currentConversation!,
      messages: [...this.state.currentConversation!.messages, newMessage],
      updatedAt: now,
      // Actualizar título si es el primer mensaje del usuario
      title: this.state.currentConversation!.messages.length === 0 && role === 'user' 
        ? this.generateTitle(content)
        : this.state.currentConversation!.title
    };

    // Actualizar en la lista de conversaciones
    const updatedConversations = this.state.conversations.map(conv => 
      conv.id === updatedConversation.id ? updatedConversation : conv
    );

    // Mover conversación al inicio de la lista
    const sortedConversations = [
      updatedConversation,
      ...updatedConversations.filter(conv => conv.id !== updatedConversation.id)
    ];

    this.setState({
      currentConversation: updatedConversation,
      conversations: sortedConversations,
      filteredConversations: this.filterConversations(sortedConversations, this.state.searchQuery),
      lastMessageId: messageId,
      totalMessages: this.calculateTotalMessages(sortedConversations)
    });

    await this.save();
    return messageId;
  }

  // Establecer estado de procesamiento
  setProcessing(isProcessing: boolean): void {
    this.setState({ isProcessing });
  }

  // Limpiar conversación actual
  clearCurrentConversation(): void {
    this.setState({ currentConversation: null });
  }

  // Eliminar conversación
  async deleteConversation(conversationId: string): Promise<boolean> {
    const updatedConversations = this.state.conversations.filter(conv => conv.id !== conversationId);
    
    this.setState({
      conversations: updatedConversations,
      filteredConversations: this.filterConversations(updatedConversations, this.state.searchQuery),
      currentConversation: this.state.currentConversation?.id === conversationId 
        ? null 
        : this.state.currentConversation,
      totalMessages: this.calculateTotalMessages(updatedConversations)
    });

    await this.save();
    return true;
  }

  // Buscar conversaciones
  searchConversations(query: string): Conversation[] {
    const filteredConversations = this.filterConversations(this.state.conversations, query);
    
    this.setState({
      searchQuery: query,
      filteredConversations
    });
    
    return filteredConversations.map(conv => ({
      ...conv,
      messageCount: conv.messages.length,
      lastMessage: conv.messages[conv.messages.length - 1]?.content || ''
    }));
  }

  // Filtrar conversaciones por query
  private filterConversations(conversations: Conversation[], query: string): Conversation[] {
    if (!query.trim()) {
      return conversations;
    }

    const lowerQuery = query.toLowerCase();
    
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(lowerQuery) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(lowerQuery))
    );
  }

  // Exportar conversación
  exportConversation(conversationId: string, format: 'json' | 'txt' | 'md' = 'json'): string | null {
    const conversation = this.state.conversations.find(conv => conv.id === conversationId);
    if (!conversation) return null;

    switch (format) {
      case 'json':
        return JSON.stringify(conversation, null, 2);
      
      case 'txt':
        return this.conversationToText(conversation);
      
      case 'md':
        return this.conversationToMarkdown(conversation);
      
      default:
        return null;
    }
  }

  // Convertir conversación a texto plano
  private conversationToText(conversation: Conversation): string {
    const header = `Conversación: ${conversation.title}\nFecha: ${new Date(conversation.createdAt).toLocaleString()}\n${'='.repeat(50)}\n\n`;
    
    const messages = conversation.messages.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const sender = msg.role === 'user' ? 'Usuario' : 'Gemini';
      return `[${timestamp}] ${sender}:\n${msg.content}\n`;
    }).join('\n');

    return header + messages;
  }

  // Convertir conversación a Markdown
  private conversationToMarkdown(conversation: Conversation): string {
    const header = `# ${conversation.title}\n\n**Fecha:** ${new Date(conversation.createdAt).toLocaleString()}\n\n---\n\n`;
    
    const messages = conversation.messages.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const sender = msg.role === 'user' ? '👤 **Usuario**' : '🤖 **Gemini**';
      return `## ${sender}\n*${timestamp}*\n\n${msg.content}\n\n---\n`;
    }).join('\n');

    return header + messages;
  }

  // Limpiar conversaciones antiguas
  async cleanupOldConversations(daysToKeep: number): Promise<number> {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const conversationsToKeep = this.state.conversations.filter(conv => conv.updatedAt > cutoffDate);
    const deletedCount = this.state.conversations.length - conversationsToKeep.length;

    if (deletedCount > 0) {
      this.setState({
        conversations: conversationsToKeep,
        filteredConversations: this.filterConversations(conversationsToKeep, this.state.searchQuery),
        totalMessages: this.calculateTotalMessages(conversationsToKeep),
        currentConversation: conversationsToKeep.find(conv => conv.id === this.state.currentConversation?.id) || null
      });

      await this.save();
    }

    return deletedCount;
  }

  // Obtener estadísticas
  getStats(): {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    oldestConversation: Date | null;
    newestConversation: Date | null;
  } {
    const conversations = this.state.conversations;
    
    return {
      totalConversations: conversations.length,
      totalMessages: this.state.totalMessages,
      averageMessagesPerConversation: conversations.length > 0 
        ? Math.round(this.state.totalMessages / conversations.length)
        : 0,
      oldestConversation: conversations.length > 0 
        ? new Date(Math.min(...conversations.map(conv => conv.createdAt)))
        : null,
      newestConversation: conversations.length > 0
        ? new Date(Math.max(...conversations.map(conv => conv.updatedAt)))
        : null
    };
  }

  // Cambiar modelo actual
  setCurrentModel(model: string): void {
    this.setState({ currentModel: model });
  }

  // Obtener historial para API (formato compatible con Gemini)
  getApiHistory(): any[] {
    if (!this.state.currentConversation) return [];
    
    return this.state.currentConversation.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));
  }

  // Limpiar todos los datos (para modo incógnito)
  async clearAllData(): Promise<void> {
    this.setState({
      currentConversation: null,
      conversations: [],
      filteredConversations: [],
      totalMessages: 0,
      searchQuery: '',
      lastMessageId: ''
    });
    await this.save();
    console.log('Todos los datos de chat han sido eliminados');
  }

  // Limpieza inteligente basada en configuración
  async smartCleanup(): Promise<{
    deletedConversations: number;
    freedSpaceMB: number;
    keptRecent: number;
  }> {
    const { configStore } = require('./index');
    const config = configStore.getPrivacySettings();
    
    if (!config.autoCleanup) {
      return { deletedConversations: 0, freedSpaceMB: 0, keptRecent: 0 };
    }

    const now = Date.now();
    const retentionMs = config.dataRetention * 24 * 60 * 60 * 1000;
    const keepRecentMs = config.keepRecentDays * 24 * 60 * 60 * 1000;
    
    let conversationsToKeep: Conversation[] = [];
    let deletedCount = 0;
    let estimatedFreedSpace = 0;

    for (const conv of this.state.conversations) {
      const age = now - conv.updatedAt;
      const isRecent = age < keepRecentMs;
      const isWithinRetention = age < retentionMs;
      
      if (isRecent || isWithinRetention) {
        conversationsToKeep.push(conv);
      } else {
        deletedCount++;
        // Estimar espacio liberado (aproximado)
        estimatedFreedSpace += JSON.stringify(conv).length;
      }
    }

    // Verificar límite de almacenamiento
    const currentSizeBytes = JSON.stringify(conversationsToKeep).length;
    const maxSizeBytes = config.maxStorageSize * 1024 * 1024; // MB a bytes
    
    if (currentSizeBytes > maxSizeBytes) {
      // Eliminar conversaciones más antiguas hasta estar bajo el límite
      conversationsToKeep.sort((a, b) => b.updatedAt - a.updatedAt);
      
      while (JSON.stringify(conversationsToKeep).length > maxSizeBytes && conversationsToKeep.length > 0) {
        const removed = conversationsToKeep.pop();
        if (removed) {
          deletedCount++;
          estimatedFreedSpace += JSON.stringify(removed).length;
        }
      }
    }

    // Actualizar estado
    this.setState({
      conversations: conversationsToKeep,
      filteredConversations: this.filterConversations(conversationsToKeep, this.state.searchQuery),
      totalMessages: this.calculateTotalMessages(conversationsToKeep),
      currentConversation: conversationsToKeep.find(conv => conv.id === this.state.currentConversation?.id) || null
    });

    await this.save();

    const result = {
      deletedConversations: deletedCount,
      freedSpaceMB: Math.round(estimatedFreedSpace / (1024 * 1024) * 100) / 100,
      keptRecent: conversationsToKeep.filter(conv => (now - conv.updatedAt) < keepRecentMs).length
    };

    console.log('Limpieza inteligente completada:', result);
    return result;
  }

  // Obtener tamaño actual de almacenamiento
  getStorageInfo(): {
    totalConversations: number;
    totalMessages: number;
    estimatedSizeMB: number;
    oldestDate: Date | null;
    newestDate: Date | null;
  } {
    const conversations = this.state.conversations;
    const estimatedSizeBytes = JSON.stringify(conversations).length;
    
    return {
      totalConversations: conversations.length,
      totalMessages: this.state.totalMessages,
      estimatedSizeMB: Math.round(estimatedSizeBytes / (1024 * 1024) * 100) / 100,
      oldestDate: conversations.length > 0 
        ? new Date(Math.min(...conversations.map(conv => conv.createdAt)))
        : null,
      newestDate: conversations.length > 0
        ? new Date(Math.max(...conversations.map(conv => conv.updatedAt)))
        : null
    };
  }

  // Exportar todos los datos antes de limpieza
  async exportAllData(): Promise<string> {
    const data = {
      exportDate: new Date().toISOString(),
      totalConversations: this.state.conversations.length,
      totalMessages: this.state.totalMessages,
      conversations: this.state.conversations
    };
    
    return JSON.stringify(data, null, 2);
  }

  // Verificar si necesita limpieza automática
  needsCleanup(): boolean {
    const { configStore } = require('./index');
    return configStore.shouldRunAutoCleanup();
  }
}
