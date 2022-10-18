using System;
using System.Threading;
using Websocket.Client;
using System.Net.WebSockets;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace wsSAGE
{
  class Program
  {
    private string token = "";
    static void Main(string[] args)
    {
      Program prg = new Program();
      prg.Initialize();
    }

    private void Initialize()
    {
      Console.WriteLine("SAGE3>");
      try
      {
        // Open the text file using a stream reader.
        using (var sr = new StreamReader("token.json"))
        {
          // Read the stream as a string
          var text = sr.ReadToEnd();
          JObject json = JObject.Parse(text);
          this.token = (string)json["token"];
          Console.WriteLine("Token> " + this.token);
        }
      }
      catch (IOException e)
      {
        Console.WriteLine("The file could not be read:");
        Console.WriteLine(e.Message);
      }

      try
      {
        var exitEvent = new ManualResetEvent(false);
        var url = new Uri("ws://localhost:3333/api");

        // Factory to build sockets with auth header
        var factory = new Func<ClientWebSocket>(() =>
        {
          var c = new ClientWebSocket { };
          c.Options.SetRequestHeader("Authorization", "Bearer " + this.token);
          return c;
        });

        using (var client = new WebsocketClient(url, factory))
        {
          client.ReconnectTimeout = TimeSpan.FromSeconds(30);
          client.ReconnectionHappened.Subscribe(info =>
          {
            if (info.Type == ReconnectionType.Initial)
            {
              Console.WriteLine("Ready");

              // List of rooms
              string messageId = System.Guid.NewGuid().ToString();
              string data = "{\"route\":\"/api/rooms\",\"method\":\"GET\",\"id\":\"" + messageId + "\"}";
              client.Send(data);

              // List of boards
              messageId = System.Guid.NewGuid().ToString();
              data = "{\"route\":\"/api/boards\",\"method\":\"GET\",\"id\":\"" + messageId + "\"}";
              client.Send(data);

              // Subscribe to a board
              string subId = System.Guid.NewGuid().ToString();
              string boardId = "68b8c8fc-7a40-4876-b26d-499c961e27ae";
              data = "{\"route\":\"/api/subscription/boards/" + boardId + "\",\"method\":\"SUB\",\"id\":\"" + subId + "\"}";
              client.Send(data);
            }
            else
            {
              Console.WriteLine("Reconnection happened, type: " + info.Type);
            }
          });
          client.MessageReceived.Subscribe(msg =>
          {
            Console.WriteLine("Message> " + msg);
            if (msg.ToString().ToLower() == "connected")
            {
              Console.WriteLine("Message received: " + msg);
            }
          });
          client.Start();
          // Task.Run(() => client.Send("{ message }"));
          exitEvent.WaitOne();
        }
      }
      catch (Exception ex)
      {
        Console.WriteLine("ERROR: " + ex.ToString());
      }
    }

  }
}
