# 💅 Nail Studio - Sistema de Agendamento de Manicure

Um site moderno e elegante para agendamento de serviços de manicure, pedicure e nail art.

## ✨ Funcionalidades

- ✅ **Seleção de Serviços**: Escolha múltiplos serviços com fotos personalizadas
- ✅ **Agendamento Inteligente**: Sistema com intervalos de 30 minutos
- ✅ **Verificação de Disponibilidade**: Evita conflitos de horários automaticamente
- ✅ **Armazenamento Local**: Seus agendamentos são salvos no navegador
- ✅ **Design Premium**: Interface moderna com gradientes e animações suaves
- ✅ **Responsivo**: Funciona perfeitamente em celulares e tablets

## 🖼️ Como Adicionar Suas Próprias Fotos aos Serviços

### Opção 1: Usar URLs de Imagens da Internet

1. Abra o arquivo `app.js`
2. Localize o array `services` no início do arquivo
3. Para cada serviço, substitua a URL em `image` pela URL da sua foto:

```javascript
{
    id: 1,
    name: 'Manicure Simples',
    description: 'Cuidados básicos com as unhas das mãos',
    icon: '💅',
    image: 'SUA_URL_AQUI', // ← Coloque a URL da sua foto aqui
    duration: 30,
    price: 35.00
}
```

### Opção 2: Usar Fotos Locais

1. Crie uma pasta chamada `images` dentro da pasta do projeto
2. Coloque suas fotos nessa pasta (ex: `manicure.jpg`, `pedicure.jpg`, etc.)
3. No arquivo `app.js`, use o caminho relativo:

```javascript
{
    id: 1,
    name: 'Manicure Simples',
    description: 'Cuidados básicos com as unhas das mãos',
    icon: '💅',
    image: 'images/manicure.jpg', // ← Caminho para sua foto local
    duration: 30,
    price: 35.00
}
```

### Dicas para Melhores Resultados:

- **Tamanho recomendado**: 400x300 pixels (proporção 4:3)
- **Formato**: JPG ou PNG
- **Qualidade**: Use imagens nítidas e bem iluminadas
- **Peso**: Mantenha abaixo de 200KB para carregamento rápido

## 🎨 Personalizando Serviços

No arquivo `app.js`, você pode personalizar cada serviço:

```javascript
{
    id: 1,                              // ID único do serviço
    name: 'Nome do Serviço',            // Nome exibido
    description: 'Descrição detalhada', // Descrição do serviço
    icon: '💅',                         // Emoji que aparece no hover
    image: 'URL_ou_caminho_da_foto',    // Foto do serviço
    duration: 30,                       // Duração em minutos
    price: 35.00                        // Preço em reais
}
```

### Para Adicionar um Novo Serviço:

1. Abra `app.js`
2. No array `services`, adicione um novo objeto:

```javascript
{
    id: 10, // Próximo ID disponível
    name: 'Meu Novo Serviço',
    description: 'Descrição do novo serviço',
    icon: '✨',
    image: 'images/novo-servico.jpg',
    duration: 45,
    price: 55.00
}
```

## 🚀 Como Usar

1. **Abra o site**: Clique duas vezes no arquivo `index.html`
2. **Escolha os serviços**: Clique nos cards dos serviços que deseja
3. **Selecione a data**: Escolha o dia do agendamento
4. **Escolha o horário**: Veja os horários disponíveis (intervalos de 30 min)
5. **Preencha seus dados**: Nome, telefone e email (opcional)
6. **Confirme**: Clique em "Confirmar Agendamento"

## 📱 Visualizar Seus Agendamentos

- Clique em "Meus Agendamentos" no menu superior
- Veja todos os seus agendamentos confirmados
- Cancele agendamentos se necessário

## ⚙️ Configurações do Sistema

### Horário de Funcionamento

Por padrão, o sistema está configurado para:
- **Início**: 9:00
- **Fim**: 18:00
- **Intervalo**: 30 minutos

Para alterar, edite no arquivo `app.js` a função `generateTimeSlots()`:

```javascript
const startHour = 9;  // Hora de início
const endHour = 18;   // Hora de fim
```

### Dias Disponíveis para Agendamento

- **Mínimo**: A partir de amanhã
- **Máximo**: Até 60 dias no futuro

Para alterar, edite no arquivo `app.js` a função `setupDatePicker()`.

## 🎨 Personalizar Cores

Para mudar as cores do site, edite o arquivo `index.css` no início:

```css
:root {
    --primary-hue: 320;      /* Matiz da cor principal (0-360) */
    --primary-sat: 75%;      /* Saturação */
    --primary-light: 55%;    /* Luminosidade */
}
```

Experimente diferentes valores de `--primary-hue`:
- **Rosa/Magenta**: 320 (padrão)
- **Roxo**: 280
- **Azul**: 220
- **Verde**: 150
- **Laranja**: 30

## 📂 Estrutura de Arquivos

```
ka/
├── index.html          # Estrutura da página
├── index.css           # Estilos e design
├── app.js              # Lógica e funcionalidades
├── images/             # Pasta para suas fotos (criar)
│   ├── manicure.jpg
│   ├── pedicure.jpg
│   └── ...
└── README.md           # Este arquivo
```

## 💡 Dicas de Uso

1. **Fotos de Qualidade**: Use fotos profissionais dos seus trabalhos
2. **Preços Atualizados**: Mantenha os preços sempre atualizados no `app.js`
3. **Backup**: Os agendamentos ficam salvos no navegador. Para não perder, não limpe os dados do navegador
4. **Teste**: Faça alguns agendamentos de teste para ver como funciona

## 🆘 Problemas Comuns

**As fotos não aparecem?**
- Verifique se a URL está correta
- Se usar fotos locais, certifique-se que o caminho está correto
- Abra o Console do navegador (F12) para ver erros

**Os horários não aparecem?**
- Certifique-se de selecionar pelo menos um serviço
- Escolha uma data válida (a partir de amanhã)

**Agendamentos sumiram?**
- Não limpe os dados do navegador
- Os dados ficam salvos localmente no navegador que você usou

## 📞 Suporte

Para dúvidas ou problemas, revise este arquivo ou verifique os comentários no código.

---

Desenvolvido com 💜 para facilitar seus agendamentos!
