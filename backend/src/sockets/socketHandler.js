// Socket.io event handlers for real-time communication

const initializeSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });

    // Example: Listen for data requests from client
    socket.on('request_data', (data) => {
      console.log('📊 Data requested:', data);
      
      // Send back some data
      socket.emit('data_update', {
        timestamp: new Date().toISOString(),
        value: Math.random() * 100,
        message: 'Real-time data update'
      });
    });

    // Example: Broadcast predictions to all clients
    socket.on('request_prediction', async (inputData) => {
      console.log('🤖 Prediction requested:', inputData);
      
      // TODO: Call AI model here
      const mockPrediction = {
        result: 'Sample prediction',
        confidence: 0.92,
        timestamp: new Date().toISOString()
      };
      
      // Send to requesting client
      socket.emit('prediction_result', mockPrediction);
      
      // Or broadcast to all clients
      // io.emit('prediction_result', mockPrediction);
    });
  });

  // Simulate real-time data updates (optional - remove if not needed)
  setInterval(() => {
    io.emit('live_data', {
      timestamp: new Date().toISOString(),
      vehicleData: {
        speed: Math.random() * 120,
        temperature: Math.random() * 100,
        fuelLevel: Math.random() * 100
      }
    });
  }, 5000); // Send update every 5 seconds
};

module.exports = { initializeSocketHandlers };
